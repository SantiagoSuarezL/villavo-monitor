import { chromium } from 'playwright';
import axios from 'axios';
import https from 'https';
import { extractTextFromPDF, normalizeEncoding, parseSectores } from './parser.js';
import { getProcessedDates, cleanOldData, upsertSector, upsertBarrio, insertReporte, insertReporteBarrios, deleteReporteBarrios } from './db.js';

process.on('unhandledRejection', (err) => {
  console.error('✗ Error no manejado:', err);
  process.exit(1);
});

const MESES: Record<string, string> = {
  'enero': '01', 'febrero': '02', 'marzo': '03',
  'abril': '04', 'mayo': '05', 'junio': '06',
  'julio': '07', 'agosto': '08', 'septiembre': '09',
  'octubre': '10', 'noviembre': '11', 'diciembre': '12',
};

const MONTHS_ES = Object.keys(MESES).map(m => m.toUpperCase());

function getCurrentMonthES(): string {
  return MONTHS_ES[new Date().getMonth()];
}

function extractDayFromFilename(fileName: string): number {
  const match = fileName.match(/(\d{2})\s+DE\s+/i);
  return match ? parseInt(match[1], 10) : 99;
}

function extractDateFromFileName(fileName: string): string {
  const match = fileName.match(/SUMINISTRO DEL SERVICIO (\d{2}) DE (\w+)/i);
  if (!match) {
    console.warn(`⚠ No se pudo extraer fecha de: ${fileName}, usando fecha actual`);
    return new Date().toISOString().split('T')[0];
  }

  const day = match[1];
  const monthName = match[2].toLowerCase();
  const month = MESES[monthName];
  if (!month) {
    console.warn(`⚠ Mes no reconocido "${match[2]}" en: ${fileName}, usando fecha actual`);
    return new Date().toISOString().split('T')[0];
  }

  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
}

export async function scrapeAllReportsThisMonth(skipDates: Set<string> = new Set()): Promise<Array<{ pdfBuffer: Buffer; url: string; fileName: string }>> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(
      'https://www.eaav.gov.co/#/documentos/Comunicados_Suministro_de_Agua',
      { waitUntil: 'networkidle', timeout: 30000 },
    );

    try {
      await page.waitForSelector('a[href*=".pdf"]', { timeout: 15000 });
    } catch {
      throw new Error('No se encontraron PDFs en la página. Posible cambio en el DOM de la SPA.');
    }

    const pdfLinks = await page.$$eval('a[href*=".pdf"]', (links) =>
      links.map((link) => ({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim() || '',
      })),
    );

    if (pdfLinks.length === 0) {
      throw new Error('No se encontraron PDFs en la página. Posible cambio en el DOM de la SPA.');
    }

    const currentMonth = getCurrentMonthES();
    const monthPDFs = pdfLinks.filter((link) => {
      const upperText = link.text.toUpperCase();
      const upperHref = link.href.toUpperCase();
      const matchesMonth = upperText.includes(currentMonth) || upperHref.includes(currentMonth);
      const isStandardFormat = /SUMINISTRO DEL SERVICIO \d{2} DE /i.test(link.text);
      return matchesMonth && isStandardFormat;
    });

    if (monthPDFs.length === 0) {
      throw new Error(`No se encontraron PDFs del mes actual (${currentMonth}) en la página.`);
    }

    monthPDFs.sort((a, b) => extractDayFromFilename(a.text) - extractDayFromFilename(b.text));

    const pendingPDFs = monthPDFs.filter(pdf => {
      const fecha = extractDateFromFileName(pdf.text);
      if (skipDates.has(fecha)) {
        console.log(`⏭ Ya procesado: ${pdf.text} (${fecha})`);
        return false;
      }
      return true;
    });

    if (pendingPDFs.length === 0) {
      console.log('✓ No hay PDFs nuevos para procesar');
      return [];
    }

    console.log(`✓ PDFs nuevos a descargar: ${pendingPDFs.length}`);

    const results: Array<{ pdfBuffer: Buffer; url: string; fileName: string }> = [];
    for (const pdf of pendingPDFs) {
      const pdfName = pdf.text || pdf.href.split('/').pop() || 'documento.pdf';
      console.log(`✓ Procesando: ${pdfName}`);

      try {
        const response = await axios.get<ArrayBuffer>(pdf.href, {
          responseType: 'arraybuffer',
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
        const pdfBuffer = Buffer.from(response.data);
        const sizeKB = (pdfBuffer.length / 1024).toFixed(1);
        console.log(`  Tamaño: ~${sizeKB}KB`);
        results.push({ pdfBuffer, url: pdf.href, fileName: pdfName });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          console.log(`  ⚠ No disponible (404), saltando`);
        } else {
          throw err;
        }
      }
    }

    return results;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  try {
    await cleanOldData();
    const processedDates = await getProcessedDates();
    console.log(`✓ Fechas ya en DB: ${processedDates.size}`);

    const reportes = await scrapeAllReportsThisMonth(processedDates);

    if (reportes.length === 0) {
      console.log('✓ Base de datos al día, nada que hacer');
      return;
    }

    console.log(`✓ Total PDFs a procesar: ${reportes.length}`);

    const extracted = await Promise.all(
      reportes.map(async ({ pdfBuffer, fileName }) => {
        const fecha = extractDateFromFileName(fileName);
        console.log(`\n→ Procesando: ${fileName} (${fecha})`);
        const textoCrudo = await extractTextFromPDF(pdfBuffer);
        const textoLimpio = normalizeEncoding(textoCrudo);
        const sectores = parseSectores(textoLimpio, fecha);
        return { fileName, sectores };
      }),
    );

    for (const { fileName, sectores } of extracted) {
      for (const sectorData of sectores) {
        const sectorId = await upsertSector(sectorData.sector, sectorData.alias);
        const reporteId = await insertReporte({
          sector_id: sectorId,
          estado: sectorData.estado,
          hora_inicio: sectorData.hora_inicio,
          hora_fin: sectorData.hora_fin,
          fecha: sectorData.fecha,
        });
        await deleteReporteBarrios(reporteId);
        const barrioIds: number[] = [];
        for (const nombreBarrio of sectorData.barrios) {
          const barrioId = await upsertBarrio(nombreBarrio, sectorId);
          barrioIds.push(barrioId);
        }
        await insertReporteBarrios(reporteId, barrioIds);
      }

      console.log(`✓ ${fileName}: ${sectores.length} sectores, ${sectores.reduce((a, s) => a + s.barrios.length, 0)} barrios`);
    }

    console.log(`\n✓ Total PDFs procesados: ${reportes.length}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error:', msg);
    process.exit(1);
  }
}

main();
