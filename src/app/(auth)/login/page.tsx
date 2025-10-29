// src/app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion, Variants } from 'framer-motion'; // <-- ALTERAÇÃO 1: Importamos o tipo Variants
import { FaEnvelope, FaLock, FaHome } from 'react-icons/fa';

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
  const containerVariants: Variants = { // <-- ALTERAÇÃO 2: Aplicamos o tipo Variants
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1], staggerChildren: 0.1 }
    },
  };

  const itemVariants: Variants = { // <-- ALTERAÇÃO 3: Aplicamos o tipo aqui também
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f7fa',
      padding: '2rem',
    }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1500px',
          borderRadius: '50px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          background: 'white',
        }}
      >
        {/* Coluna Esquerda: Formulário */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12rem 4rem',
        }}>
          <div style={{ maxWidth: '360px', width: '100%' }}>
            <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem', gap: '6px', }}>
              <img src="/images/logo.svg" alt="" style={{width: '15rem'}}/>
            </motion.div>
            <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '6px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: 0, color: '#1A3523' }}>Olá, vamos começar?</h1>
            </motion.div>
            <motion.p variants={itemVariants} style={{ color: '#667085', marginBottom: '1rem', fontSize: '1rem' }}>
              Preencha com seus dados
            </motion.p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <motion.div variants={itemVariants} style={{ position: 'relative' }}>
                <FaEnvelope size={16} color="#1A3523" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 45px',
                    borderRadius: '40px',
                    border: '1px solid #D0D5DD',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#1A3523'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 106, 255, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#D0D5DD'; e.target.style.boxShadow = 'none'; }}
                />
              </motion.div>

              <motion.div variants={itemVariants} style={{ position: 'relative' }}>
                <FaLock size={16} color="#1A3523" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 45px',
                    borderRadius: '40px',
                    border: '1px solid #D0D5DD',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#1A3523'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 106, 255, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#D0D5DD'; e.target.style.boxShadow = 'none'; }}
                />
              </motion.div>

              <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#667085' }}>
                <div>
                  <input type="checkbox" id="remember" style={{ marginRight: '8px', accentColor: '#0052cc' }} />
                  <label htmlFor="remember">Lembrar</label>
                </div>
                <a href="#" style={{ color: '#0052cc', textDecoration: 'none', fontWeight: 500 }}>Esqueceu sua senha?</a>
              </motion.div>

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '40px',
                  border: 'none',
                  background: '#1A3523',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginTop: '1rem',
                  transition: 'background 0.2s, filter 0.2s',
                }}
              >
                Login
              </motion.button>
            </form>
            {error && <p style={{ color: '#D92D20', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
          </div>
        </div>

        {/* Coluna Direita: Imagem/Gradiente */}
         <div style={{
          flex: 1,
          position: 'relative', // Importante para o vídeo se posicionar corretamente
          overflow: 'hidden', // Esconde qualquer parte do vídeo que ultrapasse o contêiner
          borderTopRightRadius: '50px', // Mantive o raio de borda do container principal
          borderBottomRightRadius: '50px',
           // Removemos os estilos de `backgroundImage`
        }}>
          <video
            autoPlay // Faz o vídeo começar a rodar automaticamente
            loop // Faz o vídeo se repetir
            muted // SILENCIA o vídeo. Necessário para `autoPlay` funcionar na maioria dos navegadores
            playsInline // Permite que o vídeo toque embutido (importante para mobile)
              style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // Garante que o vídeo preencha o contêiner sem distorcer (cortando se necessário)
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: '50px', // Aplica a borda arredondada diretamente no vídeo
              }}
            >
            {/* Coloque o caminho para o seu arquivo de vídeo */}
            <source src="/images/Scene_description_a_202510141602.mp4" type="video/mp4" />
            {/* Adicionar um formato de fallback (.webm é comum) é uma boa prática */}
            {/* <source src="/fundo-video-loop.webm" type="video/webm" /> */}
          Seu navegador não suporta a tag de vídeo.
          </video>
        </div>
      </motion.div>
    </div>
  );
}