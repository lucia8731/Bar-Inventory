import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Bar Inventory', description: 'A simple home for your bar inventory.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
