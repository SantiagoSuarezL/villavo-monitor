import { extractText } from 'unpdf';

export type EstadoServicio =
  | 'con_servicio'
  | 'baja_presion'
  | 'llenado_presurizacion'
  | 'pendiente_servicio'
  | 'suministro_normal'
  | 'con_servicio_horario';

export interface SectorData {
  sector: string;
  alias: string;
  estado: EstadoServicio;
  hora_inicio?: string;
  hora_fin?: string;
  barrios: string[];
  es_subsector: boolean;
  padre?: 'caño_grande' | 'plantas_barrio';
  fecha: string;
}

const encodingMap: Record<string, string> = {
  'Ý': 'í',
  '¾': 'ó',
  '±': 'ñ',
  'Ú': 'é',
  'ß': 'á',
  'û': '–',
  'ö': 'ª',
  '┴': 'Á',
  'º': 'º',
  '©': 'é',
};

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const result = await extractText(new Uint8Array(buffer));
  const text = (result as { text: string[] }).text.join('\n');
  console.log(`✓ Texto extraído: ~${text.length} caracteres`);
  return text;
}

export function normalizeEncoding(text: string): string {
  let result = '';
  for (const char of text) {
    result += encodingMap[char] ?? char;
  }

  const nonIdentityKeys = Object.keys(encodingMap).filter(k => encodingMap[k] !== k);
  const remaining = new Set<string>();
  for (const char of result) {
    if (nonIdentityKeys.includes(char)) {
      remaining.add(char);
    }
  }

  if (remaining.size > 0) {
    console.log(`⚠ Encoding: ${remaining.size} caracter(es) corrupto(s) restante(s): ${[...remaining].join(', ')}`);
  } else {
    console.log(`✓ Encoding: 0 caracteres corruptos restantes`);
  }

  return result;
}

function to24h(time: string): string {
  const m = time.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2] || '00';
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${min}`;
}

const estadoRegexes: Array<{ regex: RegExp; estado: EstadoServicio; hasHours: boolean }> = [
  {
    regex: /Con servicio desde (?:las |la )?(\d{1,2}(?::\d{2})?\s*(?:am|pm)).*?hasta (?:las |la )?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    estado: 'con_servicio_horario',
    hasHours: true,
  },
  {
    regex: /Con servicio hasta (?:las |la )?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    estado: 'con_servicio_horario',
    hasHours: true,
  },
  { regex: /^Con servicio\.?$/i, estado: 'con_servicio', hasHours: false },
  { regex: /Servicio con baja presión/i, estado: 'baja_presion', hasHours: false },
  { regex: /En llenado y presurización de la tubería/i, estado: 'llenado_presurizacion', hasHours: false },
  { regex: /Pendiente de servicio/i, estado: 'pendiente_servicio', hasHours: false },
  { regex: /^Suministro normal\.?$/i, estado: 'suministro_normal', hasHours: false },
];

function parseEstado(text: string): { estado: EstadoServicio; hora_inicio?: string; hora_fin?: string } | null {
  for (const { regex, estado, hasHours } of estadoRegexes) {
    const m = text.match(regex);
    if (m) {
      if (hasHours) {
        if (m[1] && m[2]) {
          return { estado, hora_inicio: to24h(m[1]), hora_fin: to24h(m[2]) };
        }
        if (m[1]) {
          return { estado, hora_fin: to24h(m[1]) };
        }
      }
      return { estado };
    }
  }
  return null;
}

function parseHeader(line: string): { sector: string; alias: string; estadoData: { estado: EstadoServicio; hora_inicio?: string; hora_fin?: string } } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;

  const left = line.substring(0, colonIdx).trim();
  const right = line.substring(colonIdx + 1).trim();

  const estadoData = parseEstado(right);
  if (!estadoData) return null;

  const aliasMatch = left.match(/^(.+?)\s*\((.+)\)$/);
  let sector: string;
  let alias: string;
  if (aliasMatch) {
    sector = aliasMatch[1].trim();
    alias = aliasMatch[2].trim();
  } else {
    sector = left;
    alias = '';
  }

  return { sector, alias, estadoData };
}

function parseBarrios(text: string): string[] {
  const raw = text.trim();
  if (!raw) return [];

  const parts: string[] = [];
  let remaining = raw;

  const yMatch = remaining.match(/^(.*?)\s+y\s+(.+)$/i);
  if (yMatch) {
    parts.push(...yMatch[1].split(',').map(s => s.trim()).filter(Boolean));
    parts.push(yMatch[2].trim());
  } else {
    parts.push(...remaining.split(',').map(s => s.trim()).filter(Boolean));
  }

  return parts.map(p => p.replace(/\.$/, '').trim()).filter(Boolean);
}

export function parseSectores(text: string, fecha: string): SectorData[] {
  const lines = text.split('\n');
  const sectores: SectorData[] = [];

  let currentParent: 'caño_grande' | 'plantas_barrio' | undefined = undefined;
  let currentSector: SectorData | null = null;
  let barrioLines: string[] = [];

  function flushBarrios() {
    if (!currentSector) return;
    if (barrioLines.length > 0) {
      currentSector.barrios = parseBarrios(barrioLines.join(' '));
    }
    barrioLines = [];
  }

  function flushSector() {
    if (!currentSector) return;
    flushBarrios();
    if (currentSector.sector && currentSector.estado) {
      sectores.push(currentSector);
    }
    currentSector = null;
  }

  for (let raw of lines) {
    raw = raw.trim();
    if (!raw) continue;

    if (/^Línea Caño Grande/i.test(raw)) {
      flushSector();
      currentParent = 'caño_grande';
      continue;
    }

    if (/^Plantas en los Barrios/i.test(raw)) {
      flushSector();
      currentParent = 'plantas_barrio';
      continue;
    }

    if (/^Línea Caño Blanco/i.test(raw)) {
      flushSector();
      currentParent = undefined;
    }

    const header = parseHeader(raw);
    if (header) {
      flushSector();
      currentSector = {
        sector: header.sector,
        alias: header.alias,
        estado: header.estadoData.estado,
        hora_inicio: header.estadoData.hora_inicio,
        hora_fin: header.estadoData.hora_fin,
        barrios: [],
        es_subsector: currentParent !== undefined
          || /Montecarlo/i.test(header.sector)
          || /Catumare/i.test(header.sector)
          || /Amarilo/i.test(header.sector)
          || header.estadoData.estado === 'suministro_normal',
        padre: currentParent,
        fecha,
      };
    } else {
      if (currentSector) {
        barrioLines.push(raw);
      }
    }
  }

  flushSector();

  return sectores;
}
