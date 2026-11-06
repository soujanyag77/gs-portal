import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GS Portal - Kid-Friendly Educational File & Resource Hub',
  description: 'Engaging, gamified educational resource portal for teachers and young learners built with Next.js, Tailwind CSS, and Supabase.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-amber-200 selection:text-amber-900 font-sans">
        {children}
      </body>
    </html>
  );
}
