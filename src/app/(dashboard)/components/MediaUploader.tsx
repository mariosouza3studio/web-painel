// src/app/(dashboard)/components/MediaUploader.tsx
'use client';

import React, { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion } from 'framer-motion';

export default function MediaUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadURL(null);
      setUploadProgress(0);
      setError(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('Por favor, selecione um arquivo primeiro.');
      return;
    }

    // Aceita apenas imagens e vídeos
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Tipo de arquivo não suportado. Apenas imagens e vídeos são permitidos.');
        return;
    }

    setIsUploading(true);
    setError(null);

    // Cria uma referência única para o arquivo no Storage
    const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Acompanha o progresso do upload
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        // Lida com erros no upload
        console.error("Erro no upload: ", error);
        setError('Ocorreu um erro durante o upload. Tente novamente.');
        setIsUploading(false);
      },
      () => {
        // Upload concluído com sucesso
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log('Arquivo disponível em:', url);
          setDownloadURL(url);
          setIsUploading(false);
          setFile(null); // Limpa o arquivo selecionado após o sucesso
        });
      }
    );
  };

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '600px', margin: '2rem 0' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#101828' }}>Upload de Mídia</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="file-upload" style={{
            display: 'block',
            padding: '2rem',
            border: '2px dashed #D0D5DD',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file ? '#E7F5E8' : '#F9FAFB'
        }}>
            {file ? `Arquivo selecionado: ${file.name}` : 'Arraste um arquivo ou clique aqui para selecionar'}
        </label>
        <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*"
            style={{ display: 'none' }}
        />
      </div>

      {isUploading && (
        <div style={{ marginBottom: '1rem' }}>
          <p>Enviando... {Math.round(uploadProgress)}%</p>
          <div style={{ width: '100%', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              style={{ width: `${uploadProgress}%`, height: '10px', background: '#16e064' }}
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>
      )}

      {error && <p style={{ color: '#D92D20' }}>{error}</p>}
      
      {downloadURL && (
        <div style={{ color: '#0F5132', background: '#D1E7DD', padding: '1rem', borderRadius: '8px' }}>
          <p>Upload concluído com sucesso!</p>
          <a href={downloadURL} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>Ver arquivo</a>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: (!file || isUploading) ? '#D0D5DD' : '#16e064',
          color: 'white',
          cursor: (!file || isUploading) ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
      </button>
    </div>
  );
}