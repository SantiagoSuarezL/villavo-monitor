import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Monitoreo en Villavo',
    short_name: 'Villavo',
    description: 'Estado del suministro de agua - EAAV Villavicencio',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f3',
    theme_color: '#b45309',
    lang: 'es',
    scope: '/',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
