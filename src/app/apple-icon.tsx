import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation — reusa paleta de icon.svg (#23201b fondo, #faf8f3 gota, #b45309 pulso)
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#23201b',
          borderRadius: 36,
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="14" fill="#23201b" />
          <path d="M32 10C32 10 15 29.5 15 40.5a17 17 0 0 0 34 0C49 29.5 32 10 32 10Z" fill="#faf8f3" />
          <path
            d="M15 42h9l4-7 6 12 4-7 11 0"
            fill="none"
            stroke="#b45309"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  )
}
