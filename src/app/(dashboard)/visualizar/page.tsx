// src/app/(dashboard)/visualizar/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Adicionado useCallback
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import Image from 'next/image'; // Adicionado import do Image

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
  const [slideDuration, setSlideDuration] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    const mediaQuery = query(collection(db, 'media'), orderBy('order'));
    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MediaItem),
      );
      setMediaItems(items);
      setIsMediaLoading(false);
    });

    const fetchSettings = async () => {
      try {
        const settingsSnapshot = await getDocs(collection(db, 'settings'));
        if (!settingsSnapshot.empty) {
          setSlideDuration(settingsSnapshot.docs[0].data().slideDuration || 5);
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    fetchSettings();

    return () => unsubscribeMedia();
  }, []);

  // AVISO CORRIGIDO: goToNext envolvido com useCallback
  const goToNext = useCallback(() => {
    if (mediaItems.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
    }
  }, [mediaItems.length]);

  useEffect(() => {
    if (isMediaLoading || isSettingsLoading || mediaItems.length === 0) {
      return;
    }

    const currentItem = mediaItems[currentIndex];
    if (currentItem.type === 'video') return;

    const timer = setTimeout(goToNext, slideDuration * 1000);

    return () => clearTimeout(timer);
  // AVISO CORRIGIDO: goToNext adicionado como dependência
  }, [currentIndex, mediaItems, slideDuration, isMediaLoading, isSettingsLoading, goToNext]);

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
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2rem' }}>
          <FaSpinner className="animate-spin" />
        </div>
      ) : !currentItem ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5rem' }}>
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
              // AVISO CORRIGIDO: <img> substituído por <Image>
              <Image
                src={currentItem.url}
                alt={currentItem.fileName}
                layout="fill"
                objectFit="cover"
              />
            ) : (
              <video
                src={currentItem.url}
                autoPlay
                muted
                onEnded={goToNext}
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