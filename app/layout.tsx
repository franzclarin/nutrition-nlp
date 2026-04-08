import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriLog — Smart Macro Tracker',
  description: 'Log meals with natural language and get AI-powered nutrition insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'DM Sans, sans-serif',
              },
              success: {
                iconTheme: {
                  primary: '#74C69D',
                  secondary: '#1A1A1A',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
