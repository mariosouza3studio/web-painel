// src/app/(dashboard)/playlists/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import Image from 'next/image'; // Importação do componente Image

// Componente para a fileira de placeholders
const PlaylistRow = ({ day }: { day: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
    }}
  >
    <span
      style={{
        width: '50px',
        textAlign: 'right',
        color: '#667085',
        fontWeight: 500,
        flexShrink: 0,
        padding: '0.5rem 0',
      }}
    >
      {day}
    </span>
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        style={{
          flex: 1,
          height: '120px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid #F0F0F0',
          minWidth: 0,
        }}
      />
    ))}
  </div>
);

export default function PlaylistsPage() {
  const [slideDuration, setSlideDuration] = useState(5);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      if (!settingsSnapshot.empty) {
        setSlideDuration(settingsSnapshot.docs[0].data().slideDuration || 5);
      }
    };
    fetchSettings();
  }, []);

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

  const days = ['Dia 10', 'Dia 11', 'Dia 12', 'Dia 13', 'Dia 14'];

  return (
    <div
      style={{
        padding: '2rem 6rem 2rem 6rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '2rem',
          flexShrink: 0,
        }}
      >
        {/* AVISO CORRIGIDO: <img> substituído por <Image> */}
        <Image
          src="/images/logo.svg"
          alt="Logo"
          width={180}
          height={40} // Adicionado height
          style={{ objectFit: 'contain' }}
        />
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'hidden',
          justifyContent: 'space-evenly',
        }}
      >
        {days.map((day) => (
          <div key={day} style={{ flex: 1, minHeight: 0 }}>
            <PlaylistRow day={day} />
          </div>
        ))}
      </main>

      <footer
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: '1rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#667085',
            }}
          >
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