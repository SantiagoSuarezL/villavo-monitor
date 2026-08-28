import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Monitoreo en Villavo - estado del agua';

// Helper local para no depender de imports con posibles side-effects en OG runtime
function formatFechaCorta(fecha: string): string {
  const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return `${d} de ${MESES_ES[m - 1]}`;
}

interface SummaryData {
  fecha: string | null;
  total_sectores: number;
  con_servicio: number;
  sin_servicio: number;
  baja_presion: number;
}

async function getSummary(): Promise<SummaryData> {
  const fallback: SummaryData = {
    fecha: null,
    total_sectores: 0,
    con_servicio: 0,
    sin_servicio: 0,
    baja_presion: 0,
  };
  try {
    const { getDbClient } = await import('@/lib/db');
    const client = getDbClient();
    const result = await client.execute({
      sql: `
        SELECT
          MAX(fecha) as fecha,
          COUNT(*) as total_sectores,
          SUM(CASE WHEN estado = 'con_servicio' OR estado = 'suministro_normal' OR estado = 'con_servicio_horario' THEN 1 ELSE 0 END) as con_servicio,
          SUM(CASE WHEN estado = 'pendiente_servicio' THEN 1 ELSE 0 END) as sin_servicio,
          SUM(CASE WHEN estado = 'baja_presion' OR estado = 'llenado_presurizacion' THEN 1 ELSE 0 END) as baja_presion,
          (SELECT MAX(hora_monitoreo) FROM reportes_diarios) as ultima_actualizacion
        FROM reportes_diarios
        WHERE fecha = (SELECT MAX(fecha) FROM reportes_diarios)
      `,
      args: [],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row || !row.fecha) return fallback;
    return {
      fecha: row.fecha ? String(row.fecha) : null,
      total_sectores: Number(row.total_sectores ?? 0),
      con_servicio: Number(row.con_servicio ?? 0),
      sin_servicio: Number(row.sin_servicio ?? 0),
      baja_presion: Number(row.baja_presion ?? 0),
    };
  } catch {
    return fallback;
  }
}

async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[] | undefined
> {
  try {
    // Intento no bloqueante: si falla, retornamos undefined y se usa fallback sans-serif
    const interUrl = 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/files/inter-latin-700-normal.woff';
    const jetbrainsUrl =
      'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/files/jetbrains-mono-latin-400-normal.woff';

    const [interRes, monoRes] = await Promise.all([
      fetch(interUrl).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
      fetch(jetbrainsUrl).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
    ]);

    const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[] = [];
    if (interRes) fonts.push({ name: 'Inter', data: interRes, weight: 700, style: 'normal' });
    if (monoRes) fonts.push({ name: 'JetBrains Mono', data: monoRes, weight: 400, style: 'normal' });
    return fonts.length > 0 ? fonts : undefined;
  } catch {
    return undefined;
  }
}

export default async function OgImage() {
  const data = await getSummary();
  const hasData = Boolean(data.fecha && data.total_sectores > 0);
  const fechaLabel = data.fecha ? formatFechaCorta(String(data.fecha)) : '';
  const fonts = await loadFonts();

  // Colores token
  const FIELD = '#23201b';
  const PAPER = '#faf8f3';
  const LINE = '#e5dfd0';
  const INK = '#26221c';
  const MUTED = '#8d8677';
  const BODY = '#575044';
  const GREEN = '#16a34a';
  const YELLOW = '#ca8a04';
  const RED = '#dc2626';
  const ACCENT = '#b45309';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: FIELD,
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Textura sutil diagonal */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.025,
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent 0 11px, #faf8f3 11px 12px)',
            display: 'flex',
          }}
        />

        {/* Card papel */}
        <div
          style={{
            flex: 1,
            backgroundColor: PAPER,
            border: `1px solid ${LINE}`,
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '36px 44px 28px 44px',
            position: 'relative',
          }}
        >
          {/* Top */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.20em',
                color: MUTED,
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              EAAV · VILLAVICENCIO
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '46px',
                fontWeight: 800,
                color: INK,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                display: 'flex',
              }}
            >
              Monitoreo en Villavo
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                color: BODY,
                letterSpacing: '0.02em',
                display: 'flex',
              }}
            >
              {hasData ? `${fechaLabel} · Estado del suministro de agua` : 'Estado del suministro de agua'}
            </div>
          </div>

          {/* Middle - stats or fallback */}
          {hasData ? (
            <div
              style={{
                display: 'flex',
                gap: '18px',
                marginTop: '28px',
                marginBottom: '12px',
              }}
            >
              {/* Con servicio */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${LINE}`,
                  borderRadius: '16px',
                  padding: '18px 18px 14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: GREEN,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      display: 'flex',
                    }}
                  >
                    Con servicio
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '42px',
                    fontWeight: 800,
                    color: GREEN,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    display: 'flex',
                  }}
                >
                  {String(data.con_servicio)}
                </div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: MUTED,
                    display: 'flex',
                  }}
                >
                  sectores
                </div>
              </div>

              {/* Baja presión */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${LINE}`,
                  borderRadius: '16px',
                  padding: '18px 18px 14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: YELLOW,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      display: 'flex',
                    }}
                  >
                    Baja presión
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '42px',
                    fontWeight: 800,
                    color: YELLOW,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    display: 'flex',
                  }}
                >
                  {String(data.baja_presion)}
                </div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: MUTED,
                    display: 'flex',
                  }}
                >
                  sectores
                </div>
              </div>

              {/* Sin servicio */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${LINE}`,
                  borderRadius: '16px',
                  padding: '18px 18px 14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: RED,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      display: 'flex',
                    }}
                  >
                    Sin servicio
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '42px',
                    fontWeight: 800,
                    color: RED,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    display: 'flex',
                  }}
                >
                  {String(data.sin_servicio)}
                </div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: MUTED,
                    display: 'flex',
                  }}
                >
                  sectores
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#f4f0e6',
                  border: `1px solid ${LINE}`,
                  borderRadius: '16px',
                  padding: '18px 18px 14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: ACCENT,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      display: 'flex',
                    }}
                  >
                    Total
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '42px',
                    fontWeight: 800,
                    color: INK,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    display: 'flex',
                  }}
                >
                  {String(data.total_sectores)}
                </div>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    color: MUTED,
                    display: 'flex',
                  }}
                >
                  sectores
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '36px',
                marginBottom: '12px',
                backgroundColor: '#ffffff',
                border: `1px solid ${LINE}`,
                borderRadius: '16px',
                padding: '36px 24px',
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '16px',
                  letterSpacing: '0.08em',
                  color: MUTED,
                  display: 'flex',
                }}
              >
                Sin datos aún · EAAV Villavicencio
              </span>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${LINE}`,
              paddingTop: '16px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: MUTED,
                display: 'flex',
              }}
            >
              Actualización automática 8:00/14:00 CO
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: MUTED,
                display: 'flex',
              }}
            >
              villavo-monitor.vercel.app
            </span>
          </div>

          {/* Icono gota decorativo esquina */}
          <div
            style={{
              position: 'absolute',
              top: '28px',
              right: '36px',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: FIELD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                backgroundColor: PAPER,
                borderRadius: '9999px',
                display: 'flex',
                // simulate droplet via extra small accent dot
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                width: '28px',
                height: '3px',
                backgroundColor: ACCENT,
                borderRadius: '9999px',
                display: 'flex',
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts } : {}),
    },
  );
}
