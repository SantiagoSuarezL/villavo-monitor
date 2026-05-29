# Monitoreo de Agua en Villavo 🚰

Monitoreo automatizado del estado del suministro de agua en Villavicencio, Colombia. Descarga los comunicados PDF diarios de la **EAAV (Empresa de Acueducto y Alcantarillado de Villavicencio)**, extrae el estado del servicio por sector y barrio, y lo despliega en un dashboard web en tiempo real.

## Stack

| Capa | Tecnología |
|------|------------|
| **Lenguaje** | TypeScript (monorepo) |
| **Package Manager** | pnpm workspaces |
| **Scraper** | Playwright + unpdf + axios |
| **Base de datos** | Turso (libsql) |
| **Frontend** | Next.js 15 (App Router) + React 19 |
| **Estilos** | Tailwind CSS v4 |
| **Gráficos** | recharts |
| **Data Fetching** | SWR v2 |
| **CI/CD** | GitHub Actions |
| **Hosting** | Vercel |

## Arquitectura

```
villavo-monitor/
├── scraper/                        # Scraper de PDFs de la EAAV
│   ├── index.ts                    # Entry point: navegación, descarga y pipeline
│   ├── parser.ts                   # Extracción de texto PDF, normalización de encoding, parsing de sectores/barrios
│   ├── db.ts                       # Operaciones CRUD contra Turso
│   └── migrate.ts                  # Creación de tablas e índices
├── src/                            # Frontend Next.js 15
│   ├── app/
│   │   ├── page.tsx                # Página principal (server component) con tabla, resumen, búsqueda y gráfico
│   │   ├── layout.tsx              # Root layout con metadatos
│   │   └── api/
│   │       ├── reports/            # GET /api/reports?q=&sector_id=
│   │       ├── sectores/           # GET /api/sectores
│   │       └── summary/            # GET /api/summary (cards de resumen)
│   ├── components/
│   │   ├── data-table.tsx          # Tabla responsive desktop/mobile con badges por estado
│   │   ├── search-bar.tsx          # Búsqueda por barrio con debounce 300ms
│   │   ├── sectores-filter.tsx     # Filtro por sector
│   │   ├── summary-cards.tsx       # 4 cards de resumen (con/sin agua, baja presión, total)
│   │   ├── update-chip.tsx         # Chip "última actualización" con polling 60s
│   │   ├── history-chart.tsx       # Línea de tiempo con recharts
│   │   └── swr-provider.tsx        # Configuración global de SWR
│   └── lib/
│       └── db.ts                   # Conexión a Turso (singleton)
├── .github/workflows/
│   └── scraper.yml                 # GitHub Actions: corre scraper 2×/día (8AM/2PM Colombia)
└── .env.example                    # Variables de entorno requeridas
```

## Requisitos

- **Node.js** >= 20 (el CI usa Node 24)
- **pnpm** >= 9 (`npm install -g pnpm`)
- Una cuenta en [Turso](https://turso.tech) con una base de datos creada
- **Playwright**: para ejecución local del scraper

## Setup

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd villavo-monitor

# 2. Instalar dependencias (workspace root + scraper)
pnpm install

# 3. Copiar y configurar variables de entorno
cp .env.example .env
```

Editar `.env`:

```env
TURSO_DATABASE_URL=libsql://<tu-db>.turso.io
TURSO_AUTH_TOKEN=<tu-token>
```

### 4. Migrar la base de datos

```bash
cd scraper
pnpm migrate
```

Esto crea las tablas: `sectores`, `barrios`, `reportes_diarios`, `reporte_barrios`, `alias_normalizacion`, más el índice único `idx_reporte_unico`.

### 5. Scraper local

Requiere Chromium + dependencias del sistema:

```bash
cd scraper

# Instalar navegador de Playwright
pnpm playwright install chromium --with-deps

# Opcional: si faltan librerías del sistema
# sudo apt install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2

# Ejecutar scraper
pnpm start
```

El scraper:
1. Navega al portal de comunicados de la EAAV
2. Filtra PDFs del mes actual en formato estándar
3. Omite PDFs ya procesados (fechas existentes en DB)
4. Extrae el texto de cada PDF con `unpdf`
5. Normaliza encoding (caracteres Latin-1 → UTF-8)
6. Parsea sectores, estado del servicio, horarios y barrios
7. Inserta/actualiza en Turso (dos fases: extracción concurrente, escritura secuencial)
8. Limpia datos >90 días

### 6. Frontend

```bash
# Development
pnpm dev

# Build
pnpm build

# Type checking
pnpm tsc --noEmit
```

Abrir [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Endpoint | Parámetros | Descripción |
|----------|------------|-------------|
| `GET /api/reports` | `q` (barrio), `sector_id` | Reportes de los últimos 30 días |
| `GET /api/sectores` | — | Lista de sectores |
| `GET /api/summary` | — | Resumen del día más reciente |

## Estados del servicio (semaforización)

| Estado | Color | Significado |
|--------|-------|-------------|
| `con_servicio` / `suministro_normal` | 🟢 Verde | Servicio activo |
| `con_servicio_horario` | 🔵 Azul | Servicio con horario definido |
| `baja_presion` / `llenado_presurizacion` | 🟡 Amarillo | Presión reducida |
| `pendiente_servicio` | 🔴 Rojo | Sin servicio |

## Automatización (GitHub Actions)

El scraper se ejecuta automáticamente 2 veces al día (8:00 AM y 2:00 PM, hora Colombia) mediante el workflow en `.github/workflows/scraper.yml`.

**Secrets requeridos en GitHub:**

| Secret | Valor |
|--------|-------|
| `TURSO_DATABASE_URL` | URL de Turso |
| `TURSO_AUTH_TOKEN` | Token de autenticación |

Agregar en: **Settings → Secrets and variables → Actions → New repository secret**

También se puede ejecutar manualmente desde la UI de Actions con `workflow_dispatch`.

## Database Schema

```sql
sectores (id, nombre_sector)
barrios (id, nombre_barrio, sector_id → sectores)
reportes_diarios (id, sector_id → sectores, estado, hora_inicio, hora_fin, fecha, hora_monitoreo)
reporte_barrios (id, reporte_id → reportes_diarios, barrio_id → barrios)
alias_normalizacion (id, alias_text, sector_id_referencia → sectores)
```

Índice único: `reportes_diarios(sector_id, fecha)` — evita duplicados por sector y día.

## Consideraciones técnicas

- **SSL**: El scraper usa `rejectUnauthorized: false` para stage.eaav.gov.co (certificado inválido). El dominio www.eaav.gov.co funciona sin bypass.
- **Encoding**: Los PDFs usan codificación Latin-1. `normalizeEncoding()` mapea caracteres corruptos a UTF-8.
- **Concurrencia**: La extracción de PDFs se hace en paralelo (`Promise.all`). Las operaciones de base de datos son **secuenciales** para evitar violaciones de FK en Turso.
- **TypeScript**: Next.js 15.2+ requiere `typescript` como devDependency en el workspace root (`pnpm add -D typescript -w`), o el build se cuelga en "Checking validity of types".
- **Limpieza**: Datos >90 días se eliminan automáticamente al inicio de cada corrida del scraper.