import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-32chars-long!!');

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /chef/dashboard
  if (pathname.startsWith('/chef/dashboard')) {
    const token = request.cookies.get('ghar_session')?.value;
    if (!token) return NextResponse.redirect(new URL('/chef/login', request.url));
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== 'chef') return NextResponse.redirect(new URL('/chef/login', request.url));
    } catch {
      return NextResponse.redirect(new URL('/chef/login', request.url));
    }
  }

  // Protect /admin (but not /admin/login if we add it later)
  // if (pathname === '/admin') {
  //   const token = request.cookies.get('ghar_session')?.value;
  //   if (!token) return NextResponse.redirect(new URL('/admin?auth=required', request.url));
  //   try {
  //     const { payload } = await jwtVerify(token, secret);
  //     if (payload.role !== 'admin') return NextResponse.redirect(new URL('/', request.url));
  //   } catch {
  //     // Will be handled client-side since admin login is on same page
  //   }
  // }

  // Protect admin dashboard after login // old code has some issue (change in 8th june)
if (pathname === '/admin') {
  const token = request.cookies.get('ghar_session')?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);

      if (payload.role !== 'admin') {
        return NextResponse.redirect(
          new URL('/', request.url)
        );
      }
    } catch {
      // Invalid token, let page show login form
    }
  }
}

  return NextResponse.next();
}

export const config = {
  matcher: ['/chef/dashboard', '/admin'],
};
