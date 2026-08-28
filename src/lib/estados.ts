export interface EstadoInfo {
  label: string;
  level: number;
  color: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

export const ESTADOS: Record<string, EstadoInfo> = {
  con_servicio: {
    label: 'Con servicio',
    level: 3,
    color: '#16a34a',
    badgeClass: 'border-green-200 bg-green-50/80 text-green-700',
    dotClass: 'bg-green-600',
    description: 'El agua llega con normalidad a este sector.',
  },
  suministro_normal: {
    label: 'Suministro normal',
    level: 3,
    color: '#16a34a',
    badgeClass: 'border-green-200 bg-green-50/80 text-green-700',
    dotClass: 'bg-green-600',
    description: 'El agua llega con normalidad a este sector.',
  },
  con_servicio_horario: {
    label: 'Con servicio horario',
    level: 2,
    color: '#2563eb',
    badgeClass: 'border-blue-200 bg-blue-50/80 text-blue-700',
    dotClass: 'bg-blue-600',
    description:
      'El agua solo llega en horarios establecidos. Las horas indicadas señalan la ventana prevista de suministro.',
  },
  baja_presion: {
    label: 'Baja presión',
    level: 1,
    color: '#ca8a04',
    badgeClass: 'border-yellow-200 bg-yellow-50/80 text-yellow-700',
    dotClass: 'bg-yellow-600',
    description: 'El agua sale con poca fuerza o no alcanza a llegar a los pisos altos.',
  },
  llenado_presurizacion: {
    label: 'Llenado/Presurización',
    level: 1,
    color: '#ca8a04',
    badgeClass: 'border-yellow-200 bg-yellow-50/80 text-yellow-700',
    dotClass: 'bg-yellow-600',
    description:
      'La red se está llenando después de una interrupción. La presión puede variar mientras se estabiliza.',
  },
  pendiente_servicio: {
    label: 'Pendiente de servicio',
    level: 0,
    color: '#dc2626',
    badgeClass: 'border-red-200 bg-red-50/80 text-red-700',
    dotClass: 'bg-red-600',
    description: 'No hay servicio de agua en el sector por trabajos o interrupciones programadas.',
  },
};

export const ESTADO_FALLBACK: EstadoInfo = {
  label: 'Sin estado',
  level: -1,
  color: '#8d8677',
  badgeClass: 'border-line bg-paper-deep text-body',
  dotClass: 'bg-mute',
  description: 'Reporte sin estado reconocido.',
};

export function getEstado(estado: string): EstadoInfo {
  return ESTADOS[estado] ?? ESTADO_FALLBACK;
}

export const LEVEL_LABELS: Record<number, string> = {
  3: 'Con servicio',
  2: 'Con horario',
  1: 'Baja presión',
  0: 'Sin servicio',
};

const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_ES_LARGO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatFechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return `${d} de ${MESES_ES[m - 1]}`;
}

export function formatMesAnio(fechas: string[]): string {
  if (fechas.length === 0) return '';
  const [y, m] = fechas[0].split('-').map(Number);
  if (!y || !m) return '';
  return `${MESES_ES_LARGO[m - 1]} de ${y}`;
}

export function formatFechaNumerica(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${date.getFullYear()}`;
}
