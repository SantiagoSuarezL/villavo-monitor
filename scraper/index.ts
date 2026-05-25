import { chromium } from 'playwright';
import axios from 'axios';
import https from 'https';
import { extractTextFromPDF, normalizeEncoding, parseSectores } from './parser.js';
import { upsertSector, upsertBarrio, insertReporte, insertReporteBarrios } from './db.js';

process.on('unhandledRejection', (err) => {
  console.error('✗ Error no manejado:', err);
  process.exit(1);
});

export async function scrapeLatestReport(): Promise<{ pdfBuffer: Buffer; url: string; fecha: string }> {
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

    const first = pdfLinks[0];
    if (!first) {
      throw new Error('No se encontraron PDFs en la página. Posible cambio en el DOM de la SPA.');
    }

    const pdfUrl = first.href;
    const pdfName = first.text || pdfUrl.split('/').pop() || 'documento.pdf';
    console.log(`✓ PDF encontrado: ${pdfName}`);
    console.log(`✓ URL: ${pdfUrl}`);

    const response = await axios.get<ArrayBuffer>(pdfUrl, {
      responseType: 'arraybuffer',
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const pdfBuffer = Buffer.from(response.data);
    const sizeKB = (pdfBuffer.length / 1024).toFixed(1);
    console.log(`✓ Tamaño: ~${sizeKB}KB`);

    const dateMatch = pdfName.match(/\d{4}-\d{2}-\d{2}/);
    const fecha = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

    return { pdfBuffer, url: pdfUrl, fecha };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  try {
    const { pdfBuffer, fecha } = await scrapeLatestReport();
    const textoCrudo = await extractTextFromPDF(pdfBuffer);
    const textoLimpio = normalizeEncoding(textoCrudo);
    const sectores = parseSectores(textoLimpio, fecha);

    for (const sectorData of sectores) {
      const sectorId = await upsertSector(sectorData.sector, sectorData.alias);
      const reporteId = await insertReporte({
        sector_id: sectorId,
        estado: sectorData.estado,
        hora_inicio: sectorData.hora_inicio,
        hora_fin: sectorData.hora_fin,
        fecha: sectorData.fecha,
      });
      const barrioIds: number[] = [];
      for (const nombreBarrio of sectorData.barrios) {
        const barrioId = await upsertBarrio(nombreBarrio, sectorId);
        barrioIds.push(barrioId);
      }
      await insertReporteBarrios(reporteId, barrioIds);
    }

    console.log(`✓ Sectores procesados: ${sectores.length}`);
    console.log(`✓ Barrios procesados: ${sectores.reduce((a, s) => a + s.barrios.length, 0)}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error:', msg);
    process.exit(1);
  }
}

main();
