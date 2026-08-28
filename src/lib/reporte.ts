export interface Reporte {
  id: number;
  sector: string;
  estado: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha: string;
  hora_monitoreo: string;
  barrios: string[];
}

const TIME_RE = /^\d{2}:\d{2}/;

// hora_monitoreo viene como CURRENT_TIMESTAMP de SQLite (UTC): "YYYY-MM-DD HH:mm:ss"
// Colombia = UTC-5 fijo (sin DST) → conversión determinística, sin Intl (hydration-safe)
export function extractTime(horaMonitoreo: string): string {
  if (!horaMonitoreo) return '—';
  const parts = horaMonitoreo.split(/[T ]/);
  const time = parts[1]?.split('.')[0] ?? '';
  if (!TIME_RE.test(time)) return '—';

  const [h, m] = time.split(':').map(Number);
  const coHour = (h - 5 + 24) % 24;
  return `${String(coHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
