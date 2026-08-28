import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock unpdf before importing parser
vi.mock('unpdf', () => ({
  extractText: vi.fn(() => ({ text: ['a', 'b'] })),
}));

import { normalizeEncoding, parseSectores, extractTextFromPDF } from './parser.js';
import { extractText } from 'unpdf';

describe('normalizeEncoding', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('mapea Ý¾±Úß → íóñéá', () => {
    const result = normalizeEncoding('Ý¾±Úß');
    expect(result).toBe('íóñéá');
  });

  it('mapea Ý → í', () => {
    expect(normalizeEncoding('Ý')).toBe('í');
  });

  it('mapea ¾ → ó', () => {
    expect(normalizeEncoding('¾')).toBe('ó');
  });

  it('mapea ± → ñ', () => {
    expect(normalizeEncoding('±')).toBe('ñ');
  });

  it('mapea Ú → é', () => {
    expect(normalizeEncoding('Ú')).toBe('é');
  });

  it('mapea ß → á', () => {
    expect(normalizeEncoding('ß')).toBe('á');
  });

  it('mapea û → –', () => {
    expect(normalizeEncoding('û')).toBe('–');
  });

  it('mapea ö → ª', () => {
    expect(normalizeEncoding('ö')).toBe('ª');
  });

  it('mapea ┴ → Á', () => {
    expect(normalizeEncoding('┴')).toBe('Á');
  });

  it('mapea © → é', () => {
    expect(normalizeEncoding('©')).toBe('é');
  });

  it('identity º → º no warn y logea 0 restantes', () => {
    const result = normalizeEncoding('º');
    expect(result).toBe('º');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('0 caracteres corruptos restantes'));
    // ensure warning not called
    const calls = logSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((c: string) => c.includes('⚠ Encoding'))).toBe(false);
  });

  it('retorna vacío para input vacío y logea 0', () => {
    const result = normalizeEncoding('');
    expect(result).toBe('');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('0 caracteres corruptos restantes'));
  });

  it('texto sin caracteres corruptos queda igual y logea 0', () => {
    const input = 'Hola mundo normal';
    expect(normalizeEncoding(input)).toBe(input);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('0 caracteres corruptos restantes'));
  });

  it('mezcla texto normal con corruptos', () => {
    const result = normalizeEncoding('Barrio El SeÝor');
    expect(result).toBe('Barrio El Seíor');
  });

  it('remaining warning filtrado: º no se considera corrupto restante', () => {
    // º es identity, debe filtrarse de nonIdentityKeys, por eso no genera warning
    normalizeEncoding('º');
    const calls = logSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((c: string) => c.includes('⚠'))).toBe(false);
  });

  it('texto mixto con múltiples mapeos', () => {
    const input = 'Ý¾±Úßûö┴º©';
    const expected = 'íóñéá–ªÁºé';
    expect(normalizeEncoding(input)).toBe(expected);
  });
});

describe('encodingMap - 10 pares individuales', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => logSpy.mockRestore());

  const cases: Array<[string, string]> = [
    ['Ý', 'í'],
    ['¾', 'ó'],
    ['±', 'ñ'],
    ['Ú', 'é'],
    ['ß', 'á'],
    ['û', '–'],
    ['ö', 'ª'],
    ['┴', 'Á'],
    ['º', 'º'],
    ['©', 'é'],
  ];

  for (const [input, expected] of cases) {
    it(`mapea ${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(normalizeEncoding(input)).toBe(expected);
    });
  }
});

describe('parseSectores integración', () => {
  const FECHA = '2026-05-20';

  it('header Sector A: Con servicio + barrios con comas e y → 3 barrios', () => {
    const text = `Sector A: Con servicio
Barrio X, Barrio Z y Barrio C.`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(1);
    expect(res[0].sector).toBe('Sector A');
    expect(res[0].alias).toBe('');
    expect(res[0].estado).toBe('con_servicio');
    expect(res[0].barrios).toEqual(['Barrio X', 'Barrio Z', 'Barrio C']);
    expect(res[0].fecha).toBe(FECHA);
  });

  it('Línea Caño Grande → padre caño_grande y es_subsector', () => {
    const text = `Línea Caño Grande
Sector B: Con servicio
Barrio 1.`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(1);
    expect(res[0].padre).toBe('caño_grande');
    expect(res[0].es_subsector).toBe(true);
  });

  it('Plantas en los Barrios → padre plantas_barrio', () => {
    const text = `Plantas en los Barrios
Sector C: Con servicio
Barrio 2.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].padre).toBe('plantas_barrio');
    expect(res[0].es_subsector).toBe(true);
  });

  it('Línea Caño Blanco resetea parent a undefined', () => {
    const text = `Línea Caño Grande
Sector X: Con servicio
Barrio 1.
Línea Caño Blanco
Sector Y: Con servicio
Barrio 2.`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(2);
    expect(res[0].padre).toBe('caño_grande');
    expect(res[1].padre).toBeUndefined();
    expect(res[1].es_subsector).toBe(false);
  });

  it('Montecarlo siempre subsector sin parent', () => {
    const text = `Montecarlo: Con servicio
Barrio M.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].es_subsector).toBe(true);
  });

  it('Catumare siempre subsector', () => {
    const text = `Catumare: Con servicio
Barrio C.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].es_subsector).toBe(true);
  });

  it('Amarilo siempre subsector (case-insensitive)', () => {
    const text = `Sector Amarilo: Con servicio
Barrio A.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].es_subsector).toBe(true);
  });

  it('suministro_normal siempre subsector sin parent', () => {
    const text = `Sector Z: Suministro normal
Barrio Z.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('suministro_normal');
    expect(res[0].es_subsector).toBe(true);
  });

  it('multi-línea barrios se unen correctamente', () => {
    const text = `Sector A: Con servicio
Barrio X,
Barrio W y Barrio Z.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].barrios).toEqual(['Barrio X', 'Barrio W', 'Barrio Z']);
  });

  it('fecha propagada a todos los sectores', () => {
    const text = `Sector A: Con servicio
Barrio 1.
Sector B: Con servicio
Barrio 2.`;
    const res = parseSectores(text, FECHA);
    expect(res.every(s => s.fecha === FECHA)).toBe(true);
  });

  it('horario rango Con servicio desde las 8:00 am hasta las 5:00 pm → 08:00-17:00', () => {
    const text = `Sector Horario: Con servicio desde las 8:00 am hasta las 5:00 pm
Barrio H.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('con_servicio_horario');
    expect(res[0].hora_inicio).toBe('08:00');
    expect(res[0].hora_fin).toBe('17:00');
  });

  it('horario solo fin Con servicio hasta las 6:00 pm → solo fin 18:00', () => {
    const text = `Sector Noche: Con servicio hasta las 6:00 pm
Barrio N.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('con_servicio_horario');
    expect(res[0].hora_inicio).toBeUndefined();
    expect(res[0].hora_fin).toBe('18:00');
  });

  it('orden regex: rango antes que exacto (no confundir Con servicio)', () => {
    const text = `Sector Rango: Con servicio desde las 9:00 am hasta las 6:00 pm
Barrio R.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('con_servicio_horario');
    expect(res[0].hora_inicio).toBe('09:00');
    expect(res[0].hora_fin).toBe('18:00');
  });

  it('estado desconocido se ignora (no crea sector)', () => {
    const text = `Sector Desconocido: Estado raro
Barrio X.`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(0);
  });

  it('baja_presion se parsea', () => {
    const text = `Sector Baja: Servicio con baja presión
Barrio Baja.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('baja_presion');
  });

  it('llenado_presurizacion se parsea', () => {
    const text = `Sector Llenado: En llenado y presurización de la tubería
Barrio Llenado.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('llenado_presurizacion');
  });

  it('pendiente_servicio se parsea', () => {
    const text = `Sector Pendiente: Pendiente de servicio
Barrio P.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].estado).toBe('pendiente_servicio');
  });

  it('alias entre paréntesis se extrae', () => {
    const text = `Sector A (Alias X): Con servicio
Barrio 1.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].sector).toBe('Sector A');
    expect(res[0].alias).toBe('Alias X');
  });

  it('12 pm no suma 12 (12:00 pm → 12:00)', () => {
    const text = `Sector Mediodia: Con servicio desde las 12:00 pm hasta las 6:00 pm
Barrio M.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].hora_inicio).toBe('12:00');
  });

  it('12 am se convierte a 00:00', () => {
    const text = `Sector Madrugada: Con servicio desde las 12:00 am hasta las 6:00 am
Barrio M.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].hora_inicio).toBe('00:00');
    expect(res[0].hora_fin).toBe('06:00');
  });

  it('horario con minutos 8:30 am → 08:30', () => {
    const text = `Sector Min: Con servicio desde las 8:30 am hasta las 5:45 pm
Barrio M.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].hora_inicio).toBe('08:30');
    expect(res[0].hora_fin).toBe('17:45');
  });

  it('múltiples sectores en mismo texto se parsean correctamente', () => {
    const text = `Sector A: Con servicio
Barrio Uno.
Sector B: Pendiente de servicio
Barrio Dos.`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(2);
    expect(res[0].sector).toBe('Sector A');
    expect(res[1].sector).toBe('Sector B');
    expect(res[0].barrios).toEqual(['Barrio Uno']);
    expect(res[1].barrios).toEqual(['Barrio Dos']);
  });

  it('barrio con punto final se limpia', () => {
    const text = `Sector A: Con servicio
Barrio Con Punto.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].barrios).toEqual(['Barrio Con Punto']);
  });

  it('barrios separados solo por y → 2 barrios', () => {
    const text = `Sector A: Con servicio
Barrio Uno y Barrio Dos.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].barrios).toEqual(['Barrio Uno', 'Barrio Dos']);
  });

  it('líneas vacías se ignoran', () => {
    const text = `

Sector A: Con servicio

Barrio Uno.

`;
    const res = parseSectores(text, FECHA);
    expect(res).toHaveLength(1);
    expect(res[0].barrios).toEqual(['Barrio Uno']);
  });

  it('header sin dos puntos se ignora como barrio o ruido', () => {
    const text = `Sector Sin Dos Puntos Con servicio
Barrio X.
Sector Real: Con servicio
Barrio Real.`;
    const res = parseSectores(text, FECHA);
    // first malformed line ignored, not creates sector, second creates one
    expect(res).toHaveLength(1);
    expect(res[0].sector).toBe('Sector Real');
  });

  it('parent se propaga a múltiples sectores hasta reset', () => {
    const text = `Línea Caño Grande
Sector Uno: Con servicio
Barrio Uno.
Sector Dos: Con servicio
Barrio Dos.
Línea Caño Blanco
Sector Tres: Con servicio
Barrio Tres.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].padre).toBe('caño_grande');
    expect(res[1].padre).toBe('caño_grande');
    expect(res[2].padre).toBeUndefined();
  });

  it('horario con "la" singular (desde la 1:00 pm)', () => {
    const text = `Sector Singular: Con servicio desde la 1:00 pm hasta la 5:00 pm
Barrio S.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].hora_inicio).toBe('13:00');
    expect(res[0].hora_fin).toBe('17:00');
  });

  it('sector sin barrios queda con array vacío', () => {
    const text = `Sector Vacio: Con servicio`;
    const res = parseSectores(text, FECHA);
    expect(res[0].barrios).toEqual([]);
  });

  it('es_subsector false cuando no aplica ninguna regla', () => {
    const text = `Sector Normal: Con servicio
Barrio Normal.`;
    const res = parseSectores(text, FECHA);
    expect(res[0].es_subsector).toBe(false);
    expect(res[0].padre).toBeUndefined();
  });
});

describe('extractTextFromPDF', () => {
  it('une text array con \\n y logea caracteres', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const buf = Buffer.from('fake pdf');
    const result = await extractTextFromPDF(buf);
    expect(result).toBe('a\nb');
    expect(extractText).toHaveBeenCalled();
    const calledWith = (extractText as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Uint8Array);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Texto extraído'));
    logSpy.mockRestore();
  });

  it('usa vi.mock de unpdf con extractText mockeado', async () => {
    const buf = Buffer.from('another');
    const result = await extractTextFromPDF(buf);
    expect(result).toBe('a\nb');
  });
});
