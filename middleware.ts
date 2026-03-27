import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes through without auth checks
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId } = await auth();

  // Not signed in — send to Clerk sign-in
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
