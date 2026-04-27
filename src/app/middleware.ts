import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];

  // For now, just pass through
  // In production, verify Firebase ID token here

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};