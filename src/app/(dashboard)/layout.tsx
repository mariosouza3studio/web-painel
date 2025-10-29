// src/app/(dashboard)/layout.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { FaBars } from 'react-icons/fa'; // Ícone de menu

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const sidebarVariants = {
    closed: { width: '120px' },
    open: { width: '250px' }, // Aumenta um pouco mais que 20% para ter espaço
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F7F7' }}>
      {/* Sidebar Animada */}
      <motion.aside
        variants={sidebarVariants}
        initial="closed"
        animate={isSidebarOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          background: '#1A3523', // Verde escuro do Figma
          padding: '3rem 1.5rem',
          overflow: 'hidden',
          display: 'flex',
          borderRadius: '0 60px 60px 0',
          flexDirection: 'column',
        }}
      >
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          style={{ background: 'none', border: 'none', color: '#B9EDC4', cursor: 'pointer', fontSize: '2rem', alignSelf: 'center', marginBottom: '2rem' }}
        >
          <FaBars />
        </button>
        {/* Futuros links do menu irão aqui */}
      </motion.aside>

      {/* Conteúdo Principal */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}