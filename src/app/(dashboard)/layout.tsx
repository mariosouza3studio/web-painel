// src/app/(dashboard)/layout.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars } from 'react-icons/fa';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, writeBatch, query, doc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { usePathname } from 'next/navigation';

// --- NOVOS ESTILOS ---
const activeTextColor = '#B9EDC4'; // Cor verde claro para ativo e hover
const inactiveTextColor = '#7C9C86'; // Cor padrão do texto inativo
// --- FIM NOVOS ESTILOS ---

// Estilo para os links da navegação
// Removida a cor de background no hover
const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  padding: '12px 20px',
  // Se ativo, cor verde claro, senão, cor inativa.
  // A cor é definida AQUI e será sobrescrita pelo 'onMouseOver' se não for ativo.
  color: isActive ? activeTextColor : inactiveTextColor,
  textDecoration: 'none',
  fontSize: '1.2rem',
  fontWeight: isActive ? 300 : 200,
  borderRadius: '8px',
  transition: 'color 0.2s ease', // Transição SÓ na cor
  textAlign: 'left',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

// Variantes para os links aparecerem (permanece igual)
const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const pathname = usePathname(); 
  const isVisualizarPage = pathname === '/visualizar';

  // ... (função handleResetSettings permanece igual)
  const handleResetSettings = async () => {
    if (isResetting) return;
    if (
      !window.confirm(
        'ATENÇÃO!\n\nIsso apagará TODAS as mídias permanentemente. Esta ação não pode ser desfeita.\n\nVocê tem certeza que deseja continuar?',
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const mediaQuery = query(collection(db, 'media'));
      const querySnapshot = await getDocs(mediaQuery);

      if (querySnapshot.empty) {
        alert('Nenhuma mídia para resetar.');
        setIsResetting(false);
        return;
      }

      const batch = writeBatch(db);
      const filesToDelete: string[] = [];

      querySnapshot.forEach((docSnap) => {
        batch.delete(doc(db, 'media', docSnap.id));
        try {
          const fileUrl = docSnap.data().url;
          const fileRefPath = decodeURIComponent(
            fileUrl.split('/o/')[1].split('?')[0],
          );
          filesToDelete.push(fileRefPath);
        } catch (e) {
          console.warn(`Não foi possível parsear a URL: ${docSnap.data().url}`, e);
        }
      });

      await batch.commit();

      for (const filePath of filesToDelete) {
        try {
          await deleteObject(storageRef(storage, filePath));
        } catch (error: any) {
          if (error.code !== 'storage/object-not-found') {
            console.warn(`Falha ao deletar arquivo do Storage: ${filePath}`, error);
          }
        }
      }

      alert('Configurações resetadas com sucesso! Todas as mídias foram apagadas.');
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      alert('Falha ao resetar. Tente novamente.');
    } finally {
      setIsResetting(false);
      setSidebarOpen(false); 
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#F7F7F7',
        position: 'relative',
      }}
    >
      {/* Sidebar Animada */}
      <motion.aside
        variants={{
          closed: { width: '120px' },
          open: { width: '400px' },
        }}
        initial="closed"
        animate={isSidebarOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          background: '#1A3523',
          padding: '3rem 2rem',
          overflow: 'hidden',
          display: 'flex',
          borderRadius: '0 60px 60px 0',
          flexDirection: 'column',
          zIndex: 50,
          position: isVisualizarPage ? 'fixed' : 'relative',
          height: isVisualizarPage ? '100%' : 'auto', 
        }}
      >
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          style={{
            background: 'none',
            border: 'none',
            color: '#B9EDC4',
            cursor: 'pointer',
            fontSize: '2rem',
            alignSelf: isSidebarOpen ? 'flex-start' : 'center', 
            paddingLeft: isSidebarOpen ? '20px' : '0',
            marginBottom: '3rem',
            marginRight: isSidebarOpen ? 'auto' : '0',
            transition: 'all 0.4s ease-in-out'
          }}
        >
          <FaBars />
        </button>

        {/* Links de Navegação */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.nav
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
                hidden: {},
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
              }}
            >
              {/* Link para o Dashboard (Home) */}
              <motion.div variants={navItemVariants}>
                <Link
                  href="/dashboard"
                  style={navLinkStyle(pathname === '/dashboard')}
                  // Hover: Se NÃO estiver ativo, muda a cor para verde claro.
                  onMouseOver={(e) => {
                    if (pathname !== '/dashboard') e.currentTarget.style.color = activeTextColor;
                  }}
                  // Mouse Out: Se NÃO estiver ativo, retorna a cor para inativa.
                  onMouseOut={(e) => {
                    if (pathname !== '/dashboard') e.currentTarget.style.color = inactiveTextColor;
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  Editar
                </Link>
              </motion.div>

              {/* Link para Gerenciar Playlists */}
              <motion.div variants={navItemVariants}>
                <Link
                  href="/playlists"
                  style={navLinkStyle(pathname === '/playlists')}
                  onMouseOver={(e) => {
                    if (pathname !== '/playlists') e.currentTarget.style.color = activeTextColor;
                  }}
                  onMouseOut={(e) => {
                    if (pathname !== '/playlists') e.currentTarget.style.color = inactiveTextColor;
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  Gerenciar Playlist
                </Link>
              </motion.div>

              {/* Link para Visualizar */}
              <motion.div variants={navItemVariants}>
                <Link
                  href="/visualizar"
                  style={navLinkStyle(pathname === '/visualizar')}
                  onMouseOver={(e) => {
                    if (pathname !== '/visualizar') e.currentTarget.style.color = activeTextColor;
                  }}
                  onMouseOut={(e) => {
                    if (pathname !== '/visualizar') e.currentTarget.style.color = inactiveTextColor;
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  Visualizar
                </Link>
              </motion.div>

              {/* Botão para Resetar Configurações */}
              <motion.div variants={navItemVariants}>
                <button
                  onClick={handleResetSettings}
                  disabled={isResetting}
                  // Resetar é um caso especial de "alerta" (vermelho)
                  style={{
                    ...navLinkStyle(false),
                    color: isResetting ? '#999' : '#7C9C86',
                    opacity: isResetting ? 0.7 : 1,
                    cursor: isResetting ? 'wait' : 'pointer',
                  }}
                  // Hover no resetar mantém o background vermelho sutil, ou fica sem nada
                  onMouseOver={(e) => {
                    if (pathname !== '/visualizar') e.currentTarget.style.color = activeTextColor;
                  }}
                  onMouseOut={(e) => {
                    if (pathname !== '/visualizar') e.currentTarget.style.color = inactiveTextColor;
                  }}
                >
                  {isResetting ? 'Resetando...' : 'Resetar Configurações'}
                </button>
              </motion.div>
              
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Logo no final */}
        
      </motion.aside>

      {/* Conteúdo Principal */}
      <div
        style={{
          flex: isVisualizarPage ? 'none' : 1,
          width: isVisualizarPage ? '100%' : 'auto',
          overflowY: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </div>
    </div>
  );
}