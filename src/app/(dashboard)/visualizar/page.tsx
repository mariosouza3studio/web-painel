// src/app/(dashboard)/visualizar/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { FaTimes, FaSpinner } from 'react-icons/fa';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  order: number;
}

const slideVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.7 } },
  exit: { opacity: 0, transition: { duration: 0.7 } },
};

export default function VisualizarPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [slideDuration, setSlideDuration] = useState(5); // Valor padrão
  const [currentIndex, setCurrentIndex] = useState(0);

  // Estados de carregamento para garantir que o tempo do slide seja carregado antes do timer
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Efeito para buscar mídias E configurações
  useEffect(() => {
    // 1. Buscar Mídias
    const mediaQuery = query(collection(db, 'media'), orderBy('order'));
    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MediaItem),
      );
      setMediaItems(items);
      setIsMediaLoading(false); // Mídias carregadas
    });

    // 2. Buscar Configurações
    const fetchSettings = async () => {
      try {
        const settingsSnapshot = await getDocs(collection(db, 'settings'));
        if (!settingsSnapshot.empty) {
          // Define a duração vinda do banco
          setSlideDuration(settingsSnapshot.docs[0].data().slideDuration || 5);
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setIsSettingsLoading(false); // Configurações carregadas (ou falharam)
      }
    };

    fetchSettings();

    return () => unsubscribeMedia();
  }, []); // Este useEffect roda apenas uma vez

  const goToNext = () => {
    if (mediaItems.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
    }
  };

  // Efeito do timer para a transição automática de slides
  useEffect(() => {
    // Só roda o timer se TUDO estiver carregado (incluindo o tempo) e houver mídias
    if (isMediaLoading || isSettingsLoading || mediaItems.length === 0) {
      return; 
    }

    const currentItem = mediaItems[currentIndex];

    // Se for vídeo, o <video onEnded> cuidará da transição
    if (currentItem.type === 'video') return;

    // Se for imagem, usa o timer com a duração CORRETA
    const timer = setTimeout(() => {
      goToNext();
    }, slideDuration * 1000); // Usa o valor de slideDuration (do Firestore)

    return () => clearTimeout(timer);
    
  }, [currentIndex, mediaItems, slideDuration, isMediaLoading, isSettingsLoading]); // Depende do slideDuration

  const isLoading = isMediaLoading || isSettingsLoading;
  const currentItem = !isLoading && mediaItems.length > 0 ? mediaItems[currentIndex] : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh', 
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Botão de Fechar */}
      <Link
        href="/dashboard"
        aria-label="Voltar ao dashboard"
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          zIndex: 20, 
          color: 'white',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '1.5rem',
          textDecoration: 'none',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <FaTimes />
      </Link>

      {isLoading ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '2rem',
          }}
        >
          <FaSpinner className="animate-spin" />
        </div>
      ) : !currentItem ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '1.5rem',
          }}
        >
          Nenhuma mídia para visualizar.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            {currentItem.type === 'image' ? (
              <img
                src={currentItem.url}
                alt={currentItem.fileName}
                // CORREÇÃO: objectFit: 'cover' para tela cheia
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <video
                src={currentItem.url}
                autoPlay
                muted 
                onEnded={goToNext} 
                // CORREÇÃO: objectFit: 'cover' para tela cheia
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={goToNext} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}