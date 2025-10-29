// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
// import { useAuth } from '@/context/AuthContext'; // REMOVA OU COMENTE ESSA LINHA

// Define a forma do nosso contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Cria o contexto com um valor inicial
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Cria o Provedor do Contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged é um "ouvinte" do Firebase que nos diz em tempo real
    // se o usuário está logado ou não.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Limpa o "ouvinte" quando o componente é desmontado para evitar vazamento de memória
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do nosso contexto
export const useAuth = () => useContext(AuthContext);