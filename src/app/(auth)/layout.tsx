// src/app/(auth)/layout.tsx
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O layout aninhado não deve ter <html> ou <body>.
  // Ele deve apenas retornar os seus filhos (children).
  return <>{children}</>;
}