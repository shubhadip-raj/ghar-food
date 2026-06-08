import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-32chars-long!!');

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

//actual code 
// export async function getSession() {
//   const cookieStore = cookies();
//   const token = cookieStore.get('ghar_session')?.value;
//   if (!token) return null;
//   return verifyToken(token);
// }


// change method due to admin login not works 8th june 
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ghar_session')?.value;

  if (!token) return null;

  return await verifyToken(token);
}

export function setSessionCookie(response, token) {
  response.cookies.set('ghar_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}
