// src/app/(dashboard)/components/MediaItemCard.tsx
'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaPlay, FaTimes } from 'react-icons/fa';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
}

interface Props {
  item: MediaItem;
  onDelete: (id: string) => void;
  sortableId: string; // NOVO: ID único para o D&D
}

export default function MediaItemCard({ item, onDelete, sortableId }: Props) { // ATUALIZADO
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId }); // ATUALIZADO: Usar o sortableId

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "200px", // Largura fixa é importante para o cálculo da animação
    height: '120px',
    borderRadius: '20px',
    border: '1px solid #EAEAEA',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'grab',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.type === 'image' ? (
        <img src={item.url} alt={item.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <video
            src={item.url}
            muted
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ 
            position: 'absolute', 
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <FaPlay size={20} color="#FFFFFF" />
          </div>
        </div>
      )}
      {isHovered && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'opacity 0.2s ease-in-out',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id); // ATUALIZADO: Passa o ID original do item
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            aria-label="Excluir item de mídia"
          >
            <FaTimes size={20} color="#080808" />
          </button>
        </div>
      )}
    </div>
  );
}