// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Se o usuário está tentando acessar a página inicial ("/"),
  // vamos redirecioná-lo automaticamente para a página de login.
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Opcional: define quais rotas devem acionar o middleware
export const config = {
  matcher: ['/'],
};