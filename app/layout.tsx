import type { Metadata } from 'next';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import './globals.css';

export const metadata: Metadata = { icons: {icon:'/barbase-mark.svg'}, title: 'BarBase', description: 'Your bar’s home base. Stock, recipes and sales, together.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
