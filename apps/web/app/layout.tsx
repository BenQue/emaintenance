import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}