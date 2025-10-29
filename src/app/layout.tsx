// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Painel de Controle",
  description: "Painel de controle para sistema de mídia indoor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
          <AuthProvider> {/* 2. Envolva os children com o AuthProvider */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}