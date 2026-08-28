import Link from 'next/link';
import { CornerSquares } from '@/components/corner-squares';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-field field-texture p-[6px]">
      <main className="relative flex min-h-[calc(100vh-12px)] w-full flex-col rounded-xl border border-black/50 bg-paper paper-texture shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <CornerSquares />

        {/* Contenido centrado */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          {/* Frame + SVG grande 200x140 */}
          <div className="frame-brackets rounded-lg border border-line bg-paper px-6 py-5">
            <svg
              width={200}
              height={140}
              viewBox="0 0 200 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              role="img"
            >
              {/* Fondo sutil */}
              <rect x={1} y={1} width={198} height={138} rx={10} fill="#faf8f3" stroke="#e5dfd0" strokeWidth={0.9} />

              {/* Textura diagonal muy sutil */}
              <g opacity={0.05}>
                <path d="M14 18 L20 12" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
                <path d="M30 18 L36 12" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
                <path d="M14 34 L20 28" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
                <path d="M180 122 L186 116" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
                <path d="M164 122 L170 116" stroke="#26221c" strokeWidth={0.7} strokeLinecap="round" />
              </g>

              {/* Puntos decorativos */}
              <circle cx={16} cy={16} r={1.4} fill="#e5dfd0" />
              <circle cx={184} cy={16} r={1.4} fill="#e5dfd0" />
              <circle cx={16} cy={124} r={1.4} fill="#e5dfd0" />
              <circle cx={184} cy={124} r={1.4} fill="#e5dfd0" />

              {/* Ondas punteadas terracota - baja opacidad */}
              <ellipse
                cx={100}
                cy={96}
                rx={38}
                ry={11}
                fill="none"
                stroke="#b45309"
                strokeWidth={1.1}
                strokeDasharray="3 4.5"
                strokeLinecap="round"
                opacity={0.16}
              />
              <ellipse
                cx={100}
                cy={104}
                rx={54}
                ry={13}
                fill="none"
                stroke="#b45309"
                strokeWidth={1}
                strokeDasharray="2.5 6"
                strokeLinecap="round"
                opacity={0.09}
              />

              {/* Gota agrietada - cuerpo */}
              <path
                d="M100 20 C100 20 66 58 66 82 A34 34 0 0 0 134 82 C134 58 100 20 100 20Z"
                fill="#f4f0e6"
                stroke="#e5dfd0"
                strokeWidth={1.2}
              />
              <path
                d="M100 20 C100 20 66 58 66 82 A34 34 0 0 0 134 82 C134 58 100 20 100 20Z"
                fill="#faf8f3"
                opacity={0.97}
              />

              {/* Highlight lateral */}
              <path
                d="M88 46 C82 58 80 70 84 80"
                stroke="white"
                strokeWidth={1.3}
                strokeLinecap="round"
                opacity={0.65}
              />

              {/* Grietas internas - estilo agrietado */}
              <g opacity={0.85}>
                {/* Grieta principal vertical en zigzag */}
                <path
                  d="M100 38 L96 48 L103 56 L95 66 L102 74 L98 84"
                  fill="none"
                  stroke="#8d8677"
                  strokeWidth={1.05}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                />
                {/* Grieta secundaria izquierda */}
                <path
                  d="M86 58 L82 62 L88 68 L84 73"
                  fill="none"
                  stroke="#8d8677"
                  strokeWidth={0.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.42}
                />
                {/* Grieta secundaria derecha */}
                <path
                  d="M112 50 L116 56 L110 62 L115 70"
                  fill="none"
                  stroke="#8d8677"
                  strokeWidth={0.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.42}
                />
                {/* Pequeñas fisuras */}
                <path d="M96 48 L92 46" stroke="#8d8677" strokeWidth={0.7} strokeLinecap="round" opacity={0.35} />
                <path d="M103 56 L107 54" stroke="#8d8677" strokeWidth={0.7} strokeLinecap="round" opacity={0.35} />
                <path d="M95 66 L91 68" stroke="#8d8677" strokeWidth={0.7} strokeLinecap="round" opacity={0.35} />
              </g>

              {/* Señal punteada interrumpida (quebrada) */}
              <g opacity={0.92}>
                {/* Segmento izquierdo sólido */}
                <path
                  d="M70 88 L78 88 L82 81 L88 95"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Gap - señal interrumpida */}
                <path
                  d="M88 95 L92 95"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeDasharray="1.5 3"
                  opacity={0.5}
                />
                {/* Segmento derecho punteado/débil */}
                <path
                  d="M96 86 L102 99 L108 84 L116 88 L130 88"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 4"
                  opacity={0.52}
                />
                {/* Brillo sutil encima */}
                <path
                  d="M70 88 L78 88 L82 81 L88 95"
                  fill="none"
                  stroke="white"
                  strokeWidth={0.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.2}
                />
              </g>

              {/* Punto de interrupción - X pequeña */}
              <g opacity={0.55} transform="translate(91 94)">
                <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#8d8677" strokeWidth={1} strokeLinecap="round" />
              </g>

              {/* Interrogación sutil cerca de la gota - opcional */}
              <g opacity={0.28} transform="translate(136 42)">
                <circle cx={6} cy={6} r={6} fill="none" stroke="#8d8677" strokeWidth={0.9} />
                <text
                  x={6}
                  y={9.5}
                  textAnchor="middle"
                  fontFamily="var(--font-jetbrains), monospace"
                  fontSize={8}
                  fill="#8d8677"
                  fontWeight={700}
                >
                  ?
                </text>
              </g>
            </svg>
          </div>

          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">404</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Página no encontrada</h1>
          <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-body">El sector o reporte que buscás no existe.</p>

          <Link
            href="/"
            className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-md border border-line bg-paper px-5 py-2.5 text-sm font-medium tracking-tight text-ink transition-colors hover:border-accent hover:text-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
          >
            Volver al monitoreo
          </Link>
        </div>

        <footer className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mute sm:px-6">
          <span>Fuente: EAAV — reportes oficiales</span>
          <span className="hidden sm:inline">Villavicencio</span>
        </footer>
      </main>
    </div>
  );
}
