import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import '@/styles/common.css';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'Task Management System - Waqf',
  description: 'Manage and track student tasks efficiently',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
