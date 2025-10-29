// src/app/(dashboard)/dashboard/page.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaUpload, FaSpinner, FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa';
import { storage, db } from '@/lib/firebase';
import { ref as storageRef, deleteObject, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, orderBy, onSnapshot, writeBatch, doc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import MediaItemCard from '../components/MediaItemCard';

// Importações do Framer Motion
import { motion, AnimatePresence, Variants, useMotionValue, animate } from 'framer-motion';

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

// --- MELHORIA: Correção de Bug ---
// O 'MediaItemCard' tem 220px de largura. O valor aqui precisa ser idêntico.
const ITEM_WIDTH = 220; // Largura do MediaItemCard (estava 200)
// --- FIM DA MELHORIA ---
const ITEM_GAP = 16; // 1rem de gap

const SLOTS_PER_PAGE = 3;

// Variantes para o carrossel de Upload
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
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // States para o carrossel de Upload
  const [currentSlotPage, setCurrentSlotPage] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // States para o carrossel de D&D
  const [loopingItems, setLoopingItems] = useState<LoopItem[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);

  // Motion Value para o carrossel de D&D
  const x = useMotionValue(0);

  // --- MELHORIA: Performance (Evitar travamento inicial) ---
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  // --- FIM DA MELHORIA ---

  // --- Otimização Etapa 1: Apenas carregar dados do Firebase ---
  useEffect(() => {
    setIsLoading(true); // Garante que está carregando no mount
    const mediaQuery = query(collection(db, 'media'), orderBy('order'));

    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MediaItem));
      setMediaItems(items);
      setIsLoading(false); // <--- SÓ QUANDO OS DADOS CHEGAM
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
  // --- FIM DA ETAPA 1 ---

  // --- Otimização Etapa 2: Preparar a lista duplicada (loopingItems) ---
  // Reage à mudança em 'mediaItems' (APÓS a Etapa 1)
  useEffect(() => {
    // Se não estiver carregando (Etapa 1 terminou)
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
  }, [mediaItems, isLoading]); // Depende de mediaItems e isLoading
  // --- FIM DA ETAPA 2 ---

  // --- Otimização Etapa 3: Preparar a animação ---
  // Reage à mudança em 'loopingItems' (APÓS a Etapa 2)
  useEffect(() => {
    if (loopingItems.length === 0) {
      setIsAnimationReady(false);
      return;
    }
    // Dá um "respiro" para o React renderizar a lista duplicada (Etapa 2)
    const timer = setTimeout(() => {
      setIsAnimationReady(true);
    }, 100); 

    return () => clearTimeout(timer);
    
  }, [loopingItems]); 
  // --- FIM DA ETAPA 3 ---


  // useEffect para o timer da borda verde
  useEffect(() => {
    if (mediaItems.length > 0) {
      const timer = setInterval(() => {
        setCurrentPreviewIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
      }, slideDuration * 1000);
      return () => clearInterval(timer);
    }
  }, [mediaItems, slideDuration]);

  // --- Otimização Etapa 4: Iniciar a Animação ---
  // Reage à 'isAnimationReady' (APÓS a Etapa 3)
  useEffect(() => {
    let animationControls: any;

    // A 'isLoading' não é mais necessária aqui, pois 'isAnimationReady' já
    // depende dela indiretamente.
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
  // --- FIM DA ETAPA 4 ---

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

      // O onSnapshot vai cuidar de atualizar a UI e reiniciar a animação.
      // Damos um tempo para 'isInteracting' voltar ao normal.
      if(newOrderedItems.length === 0) {
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
    if (mediaItems[slotIndex]) return; // Slot já preenchido
    if (slotIndex !== mediaItems.length) {
      // Slot fora de ordem
      alert('Por favor, adicione mídias na ordem, preenchendo os slots vazios da esquerda para a direita.');
      return;
    }
    // Slot correto, aciona o input
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIsInteracting(true); // Pausa a animação do carrossel D&D
      handleUpload(event.target.files[0]);
    }
    event.target.value = ''; // Reseta o input para permitir o upload do mesmo arquivo
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
        setTimeout(() => setIsInteracting(false), 1000); // Reinicia a animação
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
        // O onSnapshot cuidará de reativar a animação
        setTimeout(() => setIsInteracting(false), 500); 
      }
    );
  };

  const handleDragEnd = async (event: any) => {
    setIsInteracting(true);
    const { active, over } = event;

    if (!active || !over) {
      setTimeout(() => setIsInteracting(false), 1000);
      return;
    }

    const activeOriginalId = active.id.split('-')[0];
    const overOriginalId = over.id.split('-')[0];

    if (activeOriginalId !== overOriginalId) {
      const oldIndex = mediaItems.findIndex((item) => item.id === activeOriginalId);
      const newIndex = mediaItems.findIndex((item) => item.id === overOriginalId);

      if (oldIndex === -1 || newIndex === -1) {
        setTimeout(() => setIsInteracting(false), 1000);
        return;
      }

      const newOrderedItems = arrayMove(mediaItems, oldIndex, newIndex);

      // (Atualização otimista REMOVIDA - onSnapshot é a fonte da verdade)

      const batch = writeBatch(db);
      newOrderedItems.forEach((item, index) => {
        const docRef = doc(db, 'media', item.id);
        batch.update(docRef, { order: index });
      });
      
      try {
        await batch.commit();
         // O onSnapshot vai ser disparado, o que re-renderiza e
         // o useEffect da animação vai reiniciar
         setTimeout(() => {
          setIsInteracting(false);
        }, 500); // Tempo para o onSnapshot agir
      } catch (error) {
        console.error("Erro ao reordenar: ", error);
        setTimeout(() => {
          setIsInteracting(false);
        }, 1000);
      }
      
    } else {
      // Se não houve mudança de ordem, apenas reinicia a interação
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

  // Funções para o carrossel de Upload
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
        <img
          src="/images/logo.svg"
          alt="Logo"
          width={250}
          style={{ objectFit: 'contain', marginBottom: '3rem' }}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/180x50?text=Sua+Logo+Aqui';
          }}
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
      {/* Esta seção é leve e pode ser renderizada imediatamente */}
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
          // --- MELHORIA: Acessibilidade ---
          aria-label="Página anterior"
          // --- FIM DA MELHORIA ---
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            minHeight: '310px',
            alignItems: 'center',
          }}
        >
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
                    {/* BOX DE NÚMERO (STATIC/BACK) */}
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

                    {/* --- MELHORIA: Acessibilidade (Troca de <div> por <button>) --- */}
                    <button
                      type="button"
                      onClick={() => handleUploadBoxClick(mediaIndex)}
                      disabled={!isNextAvailableSlot && !media} // Desabilita se não for o próximo ou se já tiver mídia
                      aria-label={
                        media
                          ? `Mídia ${mediaIndex + 1}: ${media.fileName}`
                          : isNextAvailableSlot
                          ? 'Adicionar mídia'
                          : 'Slot de mídia vazio'
                      }
                      style={{
                        // Reset de estilos do botão
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        textAlign: 'center',
                        // Estilos originais da <div>
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
                      {/* --- FIM DA MELHORIA --- */}
                      {isUploading ? (
                        <>
                          <FaSpinner className="animate-spin" size={30} />
                          <p>Enviando... {Math.round(uploadProgress)}%</p>
                        </>
                      ) : media ? (
                        media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt={media.fileName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                    </button>{' '}
                    {/* Fim do <button> */}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          // --- MELHORIA: Acessibilidade ---
          aria-label="Página seguinte"
          // --- FIM DA MELHORIA ---
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

      {/* --- MINHA ALTERAÇÃO: Seção de D&D (Carrossel Infinito) --- */}
      {/* Esta é a parte pesada. Só renderiza APÓS os dados chegarem. */}
      {isLoading ? (
        // Enquanto 'isLoading' for true, mostra um placeholder leve
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
          color: '#667085', // Cor do texto do footer
        }}>
          <FaSpinner className="animate-spin" size={24} />
          <p style={{fontSize: '1.1rem', marginLeft: '1rem', fontWeight: 500}}>
            Carregando mídias...
          </p>
        </div>
      ) : (
        // Quando 'isLoading' for false, renderiza a seção pesada.
        // As Etapas 2, 3 e 4 cuidarão da performance a partir daqui.
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
              {/* Renderiza o motion.div diretamente.
                O 'loopingItems' estará vazio no primeiro render, 
                depois será preenchido (Etapa 2), e SÓ ENTÃO a animação 
                será ativada (Etapa 4), prevenindo o "jank".
              */}
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem 6rem',
                  minHeight: '150px',
                  x, // Conecta o motion value ao estilo
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
      {/* --- FIM DA MINHA ALTERAÇÃO --- */}


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
              // --- MELHORIA: Acessibilidade ---
              aria-label="Duração do slide em segundos"
              // --- FIM DA MELHORIA ---
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
