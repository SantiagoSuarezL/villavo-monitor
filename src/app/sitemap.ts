import type { MetadataRoute } from 'next'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://villavo-monitor.vercel.app'
  const routes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
  ]

  try {
    const { getDbClient } = await import('@/lib/db')
    const client = getDbClient()
    const result = await client.execute({
      sql: 'SELECT id FROM sectores ORDER BY nombre_sector ASC',
      args: [],
    })
    for (const row of result.rows) {
      const id = String(row.id)
      routes.push({
        url: `${base}/?sector_id=${id}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      })
    }
  } catch {
    // fallback a base si falta env o falla DB — no romper build en CI
  }

  return routes
}
