import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadataBase = new URL('https://villavo-monitor.vercel.app');

export const viewport: Viewport = {
  themeColor: '#b45309',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://villavo-monitor.vercel.app'),
  title: 'Monitoreo en Villavo',
  description: 'Estado del suministro de agua - EAAV Villavicencio',
  openGraph: {
    title: 'Monitoreo en Villavo',
    description: 'Estado del suministro de agua - EAAV Villavicencio',
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Monitoreo en Villavo - estado del agua',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monitoreo en Villavo',
    description: 'Estado del suministro de agua - EAAV Villavicencio',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${jetbrains.variable} antialiased`}>{children}</body>
    </html>
  );
}
