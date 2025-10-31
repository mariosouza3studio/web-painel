// src/app/(dashboard)/dashboard/page.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaUpload, FaSpinner, FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa';
import { storage, db } from '@/lib/firebase';
import { ref as storageRef, deleteObject, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, orderBy, onSnapshot, writeBatch, doc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import MediaItemCard from '../components/MediaItemCard';

// Importações do Framer Motion
import { motion, AnimatePresence, Variants, useMotionValue, animate, AnimationPlaybackControls } from 'framer-motion';

// Importação do componente Image do Next.js
import Image from 'next/image';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  order: number;
}

interface LoopItem {
  id: string;
  sortableId: string;
  item: MediaItem;
}

const ITEM_WIDTH = 220;
const ITEM_GAP = 16;
const SLOTS_PER_PAGE = 3;

const slideVariants: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 30 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    transition: { type: 'spring', stiffness: 260, damping: 30 },
  }),
};

export default function DashboardPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [slideDuration, setSlideDuration] = useState(5);
  const [isPublishing, setIsPublishing] = useState(false);
  // AVISO CORRIGIDO: Variável 'currentPreviewIndex' removida pois não era usada.

  const [currentSlotPage, setCurrentSlotPage] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [loopingItems, setLoopingItems] = useState<LoopItem[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);

  const x = useMotionValue(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const mediaQuery = query(collection(db, 'media'), orderBy('order'));

    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MediaItem));
      setMediaItems(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar mídia: ", error);
      setIsLoading(false);
    });

    const fetchSettings = async () => {
      try {
        const settingsSnapshot = await getDocs(collection(db, 'settings'));
        if (!settingsSnapshot.empty) {
          setSlideDuration(settingsSnapshot.docs[0].data().slideDuration || 5);
        }
      } catch (error) {
        console.error("Erro ao buscar settings: ", error);
      }
    };
    fetchSettings();

    return () => unsubscribeMedia();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (mediaItems.length > 0) {
        const duplicated = [...mediaItems, ...mediaItems].map((item, index) => ({
          id: item.id,
          sortableId: `${item.id}-${index}`,
          item: item,
        }));
        setLoopingItems(duplicated);
      } else {
        setLoopingItems([]);
      }
    }
  }, [mediaItems, isLoading]);

  useEffect(() => {
    if (loopingItems.length === 0) {
      setIsAnimationReady(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsAnimationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [loopingItems]);

  // AVISO CORRIGIDO: useEffect do 'currentPreviewIndex' removido.

  useEffect(() => {
    // ERRO CORRIGIDO: 'animationControls' agora tem o tipo correto.
let animationControls: AnimationPlaybackControls | undefined;

    if (!isAnimationReady || mediaItems.length === 0) {
      animationControls?.stop();
      x.set(0);
      return;
    }

    const oneListWidth = mediaItems.length * ITEM_WIDTH + mediaItems.length * ITEM_GAP;
    const totalDuration = mediaItems.length * 5;

    if (isInteracting) {
      const currentX = x.get();
      animationControls = animate(x, currentX, { type: 'spring', stiffness: 100, damping: 20 });
    } else {
      const currentX = x.get();
      const startX = Math.min(0, currentX);
      const percentageDone = startX / -oneListWidth;
      const remainingDuration = totalDuration * (1 - percentageDone);
      animationControls = animate(x, [startX, -oneListWidth], {
        ease: 'linear',
        duration: remainingDuration,
        onComplete: () => {
          x.set(0);
          animate(x, [0, -oneListWidth], {
            ease: 'linear',
            duration: totalDuration,
            repeat: Infinity,
            repeatType: 'loop',
          });
        },
      });
    }

    return () => animationControls?.stop();
  }, [isInteracting, mediaItems.length, isAnimationReady, x]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const settingsCol = collection(db, 'settings');
      const settingsSnapshot = await getDocs(settingsCol);
      let settingsDocRef;

      if (settingsSnapshot.empty) {
        settingsDocRef = doc(settingsCol);
      } else {
        settingsDocRef = settingsSnapshot.docs[0].ref;
      }

      await setDoc(settingsDocRef, { slideDuration }, { merge: true });
      alert('Tempo de exibição atualizado!');
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('Falha ao atualizar.');
    }
    setIsPublishing(false);
  };

  const handleDeleteMedia = async (idToDelete: string) => {
    setIsInteracting(true);
    if (!window.confirm('Tem certeza que deseja excluir esta mídia?')) {
      setIsInteracting(false);
      return;
    }
    try {
      const itemToDelete = mediaItems.find((item) => item.id === idToDelete);
      if (!itemToDelete) throw new Error('Mídia não encontrada!');
      await deleteDoc(doc(db, 'media', idToDelete));
      const fileRef = storageRef(storage, itemToDelete.url);
      await deleteObject(fileRef);
      const newOrderedItems = mediaItems
        .filter((item) => item.id !== idToDelete)
        .sort((a, b) => a.order - b.order);
      const batch = writeBatch(db);
      newOrderedItems.forEach((item, index) => {
        if (item.order !== index) {
          const docRef = doc(db, 'media', item.id);
          batch.update(docRef, { order: index });
        }
      });
      await batch.commit();
      if (newOrderedItems.length === 0) {
        setTimeout(() => setIsInteracting(false), 1000);
      } else {
        setTimeout(() => setIsInteracting(false), 500);
      }
    } catch (error) {
      console.error('Erro ao excluir mídia: ', error);
      alert('Não foi possível excluir a mídia. Tente novamente.');
      setTimeout(() => setIsInteracting(false), 1000);
    }
  };

  const handleUploadBoxClick = (slotIndex: number) => {
    if (mediaItems[slotIndex]) return;
    if (slotIndex !== mediaItems.length) {
      alert('Por favor, adicione mídias na ordem, preenchendo os slots vazios da esquerda para a direita.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIsInteracting(true);
      handleUpload(event.target.files[0]);
    }
    event.target.value = '';
  };

  const handleUpload = (file: File) => {
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    const nextOrder = mediaItems.length;
    setUploadingSlot(nextOrder);
    setUploadProgress(0);
    const fileUploadRef = storageRef(storage, `media/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileUploadRef, file);
    uploadTask.on(
      'state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        console.error('Erro no upload: ', error);
        setUploadingSlot(null);
        alert('Erro ao enviar. Tente novamente.');
        setTimeout(() => setIsInteracting(false), 1000);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'media'), {
          url: downloadURL,
          type: fileType,
          fileName: file.name,
          createdAt: new Date(),
          order: nextOrder,
        });
        setUploadingSlot(null);
        setTimeout(() => setIsInteracting(false), 500);
      }
    );
  };
  
  // ERRO CORRIGIDO: 'event' agora tem o tipo 'DragEndEvent'
  const handleDragEnd = async (event: DragEndEvent) => {
    setIsInteracting(true);
    const { active, over } = event;

    if (!active || !over) {
      setTimeout(() => setIsInteracting(false), 1000);
      return;
    }

    const activeOriginalId = String(active.id).split('-')[0];
    const overOriginalId = String(over.id).split('-')[0];

    if (activeOriginalId !== overOriginalId) {
      const oldIndex = mediaItems.findIndex((item) => item.id === activeOriginalId);
      const newIndex = mediaItems.findIndex((item) => item.id === overOriginalId);
      if (oldIndex === -1 || newIndex === -1) {
        setTimeout(() => setIsInteracting(false), 1000);
        return;
      }
      const newOrderedItems = arrayMove(mediaItems, oldIndex, newIndex);
      const batch = writeBatch(db);
      newOrderedItems.forEach((item, index) => {
        const docRef = doc(db, 'media', item.id);
        batch.update(docRef, { order: index });
      });
      try {
        await batch.commit();
        setTimeout(() => {
          setIsInteracting(false);
        }, 500);
      } catch (error) {
        console.error("Erro ao reordenar: ", error);
        setTimeout(() => {
          setIsInteracting(false);
        }, 1000);
      }
    } else {
      setTimeout(() => {
        setIsInteracting(false);
      }, 500);
    }
  };

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const date = new Date().toLocaleString('pt-BR', options);
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  const handleNextPage = () => {
    if (mediaItems.length >= (currentSlotPage + 1) * SLOTS_PER_PAGE) {
      setPageDirection(1);
      setCurrentSlotPage((prev) => prev + 1);
    } else {
      alert('Preencha os slots atuais antes de avançar.');
    }
  };

  const handlePrevPage = () => {
    if (currentSlotPage > 0) {
      setPageDirection(-1);
      setCurrentSlotPage((prev) => prev - 1);
    }
  };

  const canGoPrev = currentSlotPage > 0;
  const canGoNext = mediaItems.length >= (currentSlotPage + 1) * SLOTS_PER_PAGE;

  const arrowButtonStyle: React.CSSProperties = {
    background: 'white',
    border: '1px solid #EAEAEA',
    borderRadius: '50%',
    width: '64px',
    height: '64px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '1.5rem',
    color: '#101828',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  };

  const rawUserName = user?.displayName || user?.email?.split('@')[0] || '';
  const capitalizedUserName = rawUserName
    ? rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1)
    : '';

  return (
    <div style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '3rem',
          padding: '0 6rem',
        }}
      >
        {/* AVISO CORRIGIDO: <img> substituído por <Image> */}
        <Image
          src="/images/logo.svg"
          alt="Logo"
          width={250}
          height={60} // Adicionado height para o componente Image
          style={{ objectFit: 'contain', marginBottom: '3rem' }}
        />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 400, color: '#101828', textAlign: 'center' }}>
          Olá, {capitalizedUserName}! O que deseja ajustar hoje?
        </h1>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,video/*"
      />

      {/* --- Seção de Slots de Upload --- */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          marginBottom: '3rem',
          justifyContent: 'center',
          padding: '0 6rem',
        }}
      >
        <button
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          aria-label="Página anterior"
          style={{
            ...arrowButtonStyle,
            opacity: canGoPrev ? 1 : 0.3,
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
          }}
          onMouseOver={(e) => {
            if (canGoPrev) e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FaArrowLeft />
        </button>

        <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: '310px', alignItems: 'center' }}>
          <AnimatePresence initial={false} custom={pageDirection}>
            <motion.div
              key={currentSlotPage}
              variants={slideVariants}
              custom={pageDirection}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                display: 'flex',
                gap: '2rem',
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                minHeight: '330px',
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((boxIndex) => {
                const mediaIndex = currentSlotPage * SLOTS_PER_PAGE + boxIndex;
                const media = mediaItems[mediaIndex];
                const isUploading = uploadingSlot === mediaIndex;
                const isNextAvailableSlot = mediaIndex === mediaItems.length;
                const isFilled = !!media;
                const isCurrentHovered = hoveredSlot === mediaIndex;
                const transformY = isFilled && isCurrentHovered ? '-3rem' : '0';

                return (
                  <div
                    key={mediaIndex}
                    onMouseEnter={() => setHoveredSlot(mediaIndex)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    style={{
                      flex: 1,
                      height: '300px',
                      position: 'relative',
                      cursor: media ? 'default' : isNextAvailableSlot ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: 0,
                        right: 0,
                        height: '280px',
                        borderRadius: '24px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'flex-end',
                        padding: '0 24px 12px 0',
                        color: '#a0a0a0ff',
                        fontSize: '1.5rem',
                        background: '#fff',
                        fontWeight: '500',
                        zIndex: 0,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        opacity: isFilled ? 1 : 0.3,
                      }}
                    >
                      {String(mediaIndex + 1).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUploadBoxClick(mediaIndex)}
                      disabled={!isNextAvailableSlot && !media}
                      aria-label={
                        media
                          ? `Mídia ${mediaIndex + 1}: ${media.fileName}`
                          : isNextAvailableSlot
                          ? 'Adicionar mídia'
                          : 'Slot de mídia vazio'
                      }
                      style={{
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        textAlign: 'center',
                        width: '100%',
                        height: '280px',
                        background: 'white',
                        borderRadius: '24px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: '1rem',
                        color: '#B0B0B0',
                        transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s ease',
                        position: 'absolute',
                        overflow: 'hidden',
                        zIndex: 1,
                        opacity: media || isNextAvailableSlot || isUploading ? 1 : 0.5,
                        transform: `translateY(${transformY})`,
                        cursor: isNextAvailableSlot ? 'pointer' : 'default',
                      }}
                    >
                      {isUploading ? (
                        <>
                          <FaSpinner className="animate-spin" size={30} />
                          <p>Enviando... {Math.round(uploadProgress)}%</p>
                        </>
                      ) : media ? (
                        media.type === 'image' ? (
                          // AVISO CORRIGIDO: <img> substituído por <Image>
                          <Image
                            src={media.url}
                            alt={media.fileName}
                            layout="fill"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              background: '#000',
                            }}
                          >
                            <video
                              src={media.url}
                              muted
                              preload="metadata"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                background: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '50%',
                                width: '60px',
                                height: '60px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                pointerEvents: 'none',
                              }}
                            >
                              <FaPlay size={24} color="#FFFFFF" />
                            </div>
                          </div>
                        )
                      ) : (
                        <>
                          <FaUpload size={24} />
                          <p>{isNextAvailableSlot ? 'Adicionar Mídia' : 'Slot Vazio'}</p>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          aria-label="Página seguinte"
          style={{
            ...arrowButtonStyle,
            opacity: canGoNext ? 1 : 0.3,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
          }}
          onMouseOver={(e) => {
            if (canGoNext) e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FaArrowRight />
        </button>
      </section>

      {/* --- Seção de D&D (Carrossel Infinito) --- */}
      {isLoading ? (
        <div style={{
          flex: 1,
          marginBottom: '4rem',
          width: '100%',
          overflow: 'hidden',
          minHeight: '150px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem 6rem',
          color: '#667085',
        }}>
          <FaSpinner className="animate-spin" size={24} />
          <p style={{ fontSize: '1.1rem', marginLeft: '1rem', fontWeight: 500 }}>
            Carregando mídias...
          </p>
        </div>
      ) : (
        <section
          style={{
            flex: 1,
            marginBottom: '4rem',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsInteracting(true)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={loopingItems.map((item) => item.sortableId)}
              strategy={horizontalListSortingStrategy}
            >
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem 6rem',
                  minHeight: '150px',
                  x,
                }}
              >
                {loopingItems.map((loopItem) => (
                  <div
                    key={loopItem.sortableId}
                    style={{
                      transition: 'scale 0.5s ease-in-out',
                      borderRadius: '20px',
                    }}
                  >
                    <MediaItemCard
                      item={loopItem.item}
                      sortableId={loopItem.sortableId}
                      onDelete={handleDeleteMedia}
                    />
                  </div>
                ))}
              </motion.div>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 6rem',
        }}
      >
        <div style={{ color: '#101828', fontSize: '1.2rem', fontWeight: 500 }}>
          {getFormattedDate()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#667085' }}>
            <span>Tempo</span>
            <input
              type="range"
              min="5"
              max="45"
              aria-label="Duração do slide em segundos"
              value={slideDuration}
              onChange={(e) => setSlideDuration(Number(e.target.value))}
              style={{ accentColor: '#1D3531' }}
            />
            <span>{slideDuration}s</span>
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            style={{
              background: '#101828',
              color: 'white',
              border: 'none',
              borderRadius: '40px',
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isPublishing ? 0.7 : 1,
            }}
          >
            {isPublishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </footer>
    </div>
  );
}