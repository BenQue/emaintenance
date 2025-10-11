import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/ui/theme-provider';

export const metadata: Metadata = {
  title: 'E-Maintenance System',
  description: 'Enterprise Equipment Maintenance Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}