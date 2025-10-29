// src/app/(dashboard)/dashboard/page.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaUpload, FaFileVideo, FaSpinner, FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa'; // Importei o FaPlay
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

const ITEM_WIDTH = 200; // Largura do MediaItemCard
const ITEM_GAP = 16;  // 1rem de gap

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

  // useEffect para carregar mídias e settings
  useEffect(() => {
    const mediaQuery = query(collection(db, 'media'), orderBy('order'));
    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaItem));
      setMediaItems(items);

      const duplicated = [...items, ...items].map((item, index) => ({
        id: item.id,
        sortableId: `${item.id}-${index}`,
        item: item,
      }));
      setLoopingItems(duplicated);
    });

    const fetchSettings = async () => {
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      if (!settingsSnapshot.empty) {
        setSlideDuration(settingsSnapshot.docs[0].data().slideDuration || 5);
      }
    };
    fetchSettings();

    return () => unsubscribeMedia();
  }, []);

  // useEffect para o timer da borda verde
  useEffect(() => {
    if (mediaItems.length > 0) {
      const timer = setInterval(() => {
        setCurrentPreviewIndex(prevIndex => (prevIndex + 1) % mediaItems.length);
      }, slideDuration * 1000);
      return () => clearInterval(timer);
    }
  }, [mediaItems, slideDuration]);

  // useEffect para a animação do carrossel D&D
  useEffect(() => {
    if (mediaItems.length === 0) return;

    const oneListWidth = mediaItems.length * ITEM_WIDTH + mediaItems.length * ITEM_GAP;
    const totalDuration = mediaItems.length * 5; 

    let animationControls;

    if (isInteracting) {
      const currentX = x.get(); 
      animationControls = animate(x, currentX, { type: "spring", stiffness: 100, damping: 20 });
    
    } else {
      const currentX = x.get();
      const startX = Math.min(0, currentX); 
      
      const percentageDone = startX / -oneListWidth;
      const remainingDuration = totalDuration * (1 - percentageDone);

      animationControls = animate(x, [startX, -oneListWidth], {
          ease: "linear",
          duration: remainingDuration,
          onComplete: () => {
              x.set(0); 
              animate(x, [0, -oneListWidth], {
                  ease: "linear",
                  duration: totalDuration,
                  repeat: Infinity,
                  repeatType: "loop",
              });
          }
      });
    }

    return () => animationControls?.stop();

  }, [isInteracting, mediaItems, x]); 


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
      console.error("Erro ao publicar:", error);
      alert("Falha ao atualizar.");
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
      const itemToDelete = mediaItems.find(item => item.id === idToDelete);
      if (!itemToDelete) throw new Error("Mídia não encontrada!");
      
      await deleteDoc(doc(db, 'media', idToDelete));
      
      const fileRef = storageRef(storage, itemToDelete.url);
      await deleteObject(fileRef);

      const newOrderedItems = mediaItems
        .filter(item => item.id !== idToDelete)
        .sort((a, b) => a.order - b.order); 

      const batch = writeBatch(db);
      newOrderedItems.forEach((item, index) => {
        if (item.order !== index) {
          const docRef = doc(db, 'media', item.id);
          batch.update(docRef, { order: index });
        }
      });
      await batch.commit();

      setTimeout(() => setIsInteracting(false), 1000);

    } catch (error) {
      console.error("Erro ao excluir mídia: ", error);
      alert("Não foi possível excluir a mídia. Tente novamente.");
      setTimeout(() => setIsInteracting(false), 1000);
    }
  };

  const handleUploadBoxClick = (slotIndex: number) => {
    if (mediaItems[slotIndex]) return;
    if (slotIndex !== mediaItems.length) {
      alert("Por favor, adicione mídias na ordem, preenchendo os slots vazios da esquerda para a direita.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleUpload(event.target.files[0]);
    }
    event.target.value = '';
  };

  const handleUpload = (file: File) => {
    setIsInteracting(true); 
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    const nextOrder = mediaItems.length; 
    setUploadingSlot(nextOrder);
    setUploadProgress(0);
    const fileUploadRef = storageRef(storage, `media/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileUploadRef, file);
    uploadTask.on('state_changed', 
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => { 
        console.error("Erro no upload: ", error); 
        setUploadingSlot(null); 
        alert("Erro ao enviar. Tente novamente.");
        setTimeout(() => setIsInteracting(false), 1000); 
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'media'), {
          url: downloadURL, type: fileType, fileName: file.name, createdAt: new Date(), order: nextOrder,
        });
        setUploadingSlot(null);
        setTimeout(() => setIsInteracting(false), 1000); 
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
      
      if (oldIndex === -1 || newIndex === -1) return; 

      const newOrderedItems = arrayMove(mediaItems, oldIndex, newIndex);
      
      setMediaItems(newOrderedItems); 

      const batch = writeBatch(db);
      newOrderedItems.forEach((item, index) => {
        const docRef = doc(db, 'media', item.id);
        batch.update(docRef, { order: index });
      });
      await batch.commit();
    }

    setTimeout(() => {
      setIsInteracting(false);
    }, 1000); 
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
      setCurrentSlotPage(prev => prev + 1);
    } else {
      alert("Preencha os slots atuais antes de avançar.");
    }
  };

  const handlePrevPage = () => {
    if (currentSlotPage > 0) {
      setPageDirection(-1); 
      setCurrentSlotPage(prev => prev - 1);
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


  return (
    // Padding vertical; padding horizontal foi movido para dentro
    <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <header style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        marginBottom: '3rem',
        padding: '0 6rem', // Padding interno
      }}>
        <img 
          src="/images/logo.svg"
          alt="Logo" 
          width={250} 
          style={{ objectFit: 'contain', marginBottom: '3rem' }}
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/180x50?text=Sua+Logo+Aqui"; }}
        />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 400, color: '#101828', textAlign: 'center' }}>
          Olá, {user?.displayName || user?.email?.split('@')[0]}! O que deseja ajustar hoje?
        </h1>
      </header>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,video/*"/>

      {/* --- Seção de Slots de Upload (COM A ANIMAÇÃO CORRIGIDA) --- */}
      <section style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2rem', 
        marginBottom: '3rem', 
        justifyContent: 'center',
        padding: '0 6rem', // Padding interno
      }}>
        
        <button 
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          style={{...arrowButtonStyle, opacity: canGoPrev ? 1 : 0.3, cursor: canGoPrev ? 'pointer' : 'not-allowed',}}
          onMouseOver={(e) => { if (canGoPrev) e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaArrowLeft />
        </button>

        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden', 
          position: 'relative', 
          minHeight: '310px', 
        }}>
          <AnimatePresence 
            initial={false} 
            custom={pageDirection} 
          >
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
              }}
            >
              {[0, 1, 2].map((boxIndex) => {
                  const mediaIndex = (currentSlotPage * SLOTS_PER_PAGE) + boxIndex;
                  const media = mediaItems[mediaIndex];
                  const isUploading = uploadingSlot === mediaIndex;
                  const isNextAvailableSlot = mediaIndex === mediaItems.length;

                  return (
                    // O contêiner principal do slot
                    <div 
                      key={mediaIndex} 
                      onClick={() => handleUploadBoxClick(mediaIndex)}
                      // Handlers de Hover
                      onMouseEnter={() => setHoveredSlot(mediaIndex)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      style={{
                        flex: 1, // Faz o slot esticar
                        height: '300px',
                        background: 'white',
                        borderRadius: '24px',
                        border: '1px solid #EAEAEA',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: '1rem',
                        color: '#B0B0B0',
                        cursor: media ? 'default' : (isNextAvailableSlot ? 'pointer' : 'not-allowed'),
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden', // CRÍTICO: Esconde o box do número
                        opacity: (media || isNextAvailableSlot || isUploading) ? 1 : 0.5,
                      }}
                      onMouseOver={(e) => { if (!media && isNextAvailableSlot) { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)'; }}}
                      onMouseOut={(e) => { if (!media) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}}
                    >
                      {isUploading ? (
                        <><FaSpinner className="animate-spin" size={30} /><p>Enviando... {Math.round(uploadProgress)}%</p></>
                      )
                      : media ? (
                        // --- ATUALIZADO: Renderiza a mídia (imagem ou vídeo) ---
                        media.type === 'image' ? (
                            <img src={media.url} alt={media.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
                        ) : (
                            // --- NOVO: Lógica do Vídeo (Request 2) ---
                            <div style={{ 
                                position: 'relative', 
                                width: '100%', 
                                height: '100%', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                background: '#000' // Fundo preto para o vídeo
                            }}>
                                <video
                                    src={media.url}
                                    muted
                                    preload="metadata" // Tenta carregar o primeiro frame
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {/* Overlay do Ícone de Play */}
                                <div style={{ 
                                    position: 'absolute', 
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    borderRadius: '50%',
                                    width: '60px', // Tamanho do ícone
                                    height: '60px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    pointerEvents: 'none' // Para não interferir no hover
                                }}>
                                    <FaPlay size={24} color="#FFFFFF" /> 
                                </div>
                            </div>
                        )
                      )
                      : (
                        <><FaUpload size={24} /><p>{isNextAvailableSlot ? 'Adicionar Mídia' : 'Slot Vazio'}</p></>
                      )}
                      
                      {/* --- ATUALIZADO: LÓGICA DO OVERLAY DE NÚMERO --- */}
                      <AnimatePresence>
                        {/* Só mostra se tiver mídia E o mouse estiver em cima */}
                        {media && hoveredSlot === mediaIndex && (
                          <motion.div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '60px', // Altura do box branco
                              background: 'white',
                              // --- NOVO: Cantos Arredondados (Request 1) ---
                              borderTopLeftRadius: '16px', 
                              borderTopRightRadius: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: '24px',
                              color: '#B0B0B0', // Cor cinza
                              fontSize: '1.5rem',
                              fontWeight: '600',
                              pointerEvents: 'none', // Para não atrapalhar o mouse
                              boxShadow: '0 -5px 15px rgba(0, 0, 0, 0.05)'
                            }}
                            initial={{ y: 60 }} // Começa abaixo (escondido)
                            animate={{ y: 0 }} // Sobe para a posição 0
                            exit={{ y: 60 }} // Desce ao sair
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          >
                            {/* Formata o número (ex: 1 -> 01) */}
                            {String(mediaIndex + 1).padStart(2, '0')}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* --- FIM DA LÓGICA DO OVERLAY --- */}

                    </div>
                  );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <button 
          onClick={handleNextPage} 
          disabled={!canGoNext}
          style={{...arrowButtonStyle, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'not-allowed',}}
          onMouseOver={(e) => { if (canGoNext) e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaArrowRight />
        </button>

      </section>

      {/* Seção de D&D (Carrossel Infinito) */}
      <section 
        style={{ 
          flex: 1, 
          marginBottom: '4rem',
          width: '100%', 
          overflow: 'hidden', 
          background: '#F0F0F0',
        }}
      >
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={() => setIsInteracting(true)} // Para a animação
          onDragEnd={handleDragEnd} // Reinicia a animação
        >
          <SortableContext 
            items={loopingItems.map(item => item.sortableId)} 
            strategy={horizontalListSortingStrategy}
          >
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem', 
                padding: '1rem 6rem', // Padding interno
                minHeight: '150px',
                x, // Conecta o motion value ao estilo
              }}
            >
              {loopingItems.map((loopItem, index) => (
                <div 
                  key={loopItem.sortableId} 
                  style={{ 
                    // Borda verde usa o índice original
                    boxShadow: (index % mediaItems.length) === currentPreviewIndex ? '0 0 0 2px #16e064' : 'none',
                    transition: 'box-shadow 0.5s ease-in-out',
                    borderRadius: '12px'
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

      <footer style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 6rem', // Padding interno
      }}>
        <div style={{ color: '#101828', fontSize: '1.2rem', fontWeight: 500 }}>
          {getFormattedDate()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#667085' }}>
            <span>Tempo</span>
            <input 
              type="range" 
              min="1" max="30" 
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
              borderRadius: '12px',
              padding: '12px 24px',
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