// src/app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion, Variants } from 'framer-motion';
// Importamos o componente Image do next
import Image from 'next/image';
// Importamos o ícone de seta para replicar o design
import { FaArrowLeft } from 'react-icons/fa';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
    }
  };

  // --- Animações ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ---------------------------------------------------------- */}
      {/* Coluna de Fundo/Mídia (Fundo da Tela) */}
      {/* ---------------------------------------------------------- */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}>

        {/* IMAGEM DE FUNDO - Substituindo o Vídeo */}
        <Image
          src="/images/img-login-1.png" 
          alt="Background"
          fill 
          style={{
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
        }} />

        {}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '8%',
            width: '40%',
            zIndex: 4,
            color: 'white',
          }}
        >
          <motion.h2 variants={itemVariants} style={{
            fontSize: '3rem',
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: '1rem',
          }}>
            Uma nova forma de comunicar, conectar e inspirar através das telas.
          </motion.h2>
          <motion.p variants={itemVariants} style={{
            fontSize: '1rem',
            lineHeight: 1.5,
            color: '#D0D5DD'
          }}>
            O ArtPlay é o sistema de mídia indoor do Grupo Artvac, que simplifica o controle e a transmissão de conteúdos, transformando cada tela em um canal de comunicação inteligente.
          </motion.p>
          {/* Indicadores de página/slider (os pontos brancos) */}
          <motion.div variants={itemVariants} style={{ marginTop: '3rem', display: 'flex', gap: '8px' }}>
            <div style={{ width: '25px', height: '6px', borderRadius: '3px', background: 'white' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#999' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#999' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#999' }}></div>
          </motion.div>
        </motion.div>

        {/* BOTÃO VOLTAR - Ajustado para ficar exatamente no topo da área visível */}
        <a
          href="/"
          style={{
            position: 'absolute',
            top: '50px',
            left: '50px',
            color: 'white',
            textDecoration: 'none',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {/* Ícone de Seta da Referência */}
          <FaArrowLeft size={16} /> Voltar
        </a>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Box de Login (Flutuante à Direita) */}
      {/* ---------------------------------------------------------- */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'fixed',
          right: '8%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '50%',
          maxWidth: '700px',
          background: 'white',
          borderRadius: '40px',
          padding: '6em 6rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%' }}>
          {/* Logo */}
          <motion.div variants={itemVariants} style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <Image
                src="/images/logo.svg"
                alt="ArtPlay Logo"
                width={150}
                height={40}
                style={{ width: '220px', height: 'auto', margin: '0 auto' }}
            />
          </motion.div>

          {/* Título e Subtítulo */}
          <motion.h1 variants={itemVariants} style={{ fontSize: '3rem', fontWeight: 600, marginBottom: '10px', color: '#242424ff' }}>
            Olá, vamos começar?
          </motion.h1>
          <motion.p variants={itemVariants} style={{ color: '#667085', marginBottom: '3rem', fontSize: '1.1rem' }}>
            Faça login e controle as telas do Grupo Artvac.
          </motion.p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Campo Email */}
            <motion.div variants={itemVariants} style={{ position: 'relative' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '1rem', fontWeight: 500, color: '#1A3523', marginBottom: '0.5rem' }}>Email</label>
              <input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: '40px',
                  background: '#f3f3f3ff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.border = 'none'; }}
                onBlur={(e) => { e.target.style.border = 'none'; }}
              />
            </motion.div>

            {/* Campo Senha */}
            <motion.div variants={itemVariants} style={{ position: 'relative' }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1A3523', marginBottom: '0.5rem' }}>Senha</label>
              <input
                id="password"
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: '40px',
                  background: '#f3f3f3ff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.border = 'none'; }}
                onBlur={(e) => { e.target.style.border = 'none'; }}
              />
            </motion.div>

            {/* Checkbox e Link de Senha */}
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#949494ff' }}>
                <input type="checkbox" id="remember" style={{ marginRight: '8px', accentColor: '#1A3523', borderRadius: '40px', }} />
                <label htmlFor="remember">Lembrar de mim</label>
              </div>
              <a href="#" style={{ color: '#949494ff', textDecoration: 'none', fontWeight: 500 }}>Esqueceu sua senha?</a>
            </motion.div>

            {/* Botão Login */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '40px',
                border: 'none',
                background: '#242424ff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: 600,
                marginTop: '1.5rem',
                transition: 'background 0.2s',
              }}
            >
              Entrar
            </motion.button>
          </form>
          {error && <p style={{ color: '#D92D20', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}