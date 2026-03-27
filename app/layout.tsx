import type { Metadata } from 'next';
import { ClerkProvider, UserButton } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'LexPulse',
  description: 'Weekly US legal intelligence digest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-gray-50 text-gray-900 font-mono min-h-screen">
          <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold text-sm tracking-tight">
              LexPulse
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/settings" className="text-gray-500 hover:text-gray-900">
                Settings
              </a>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
