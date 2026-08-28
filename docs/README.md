# Docs — Villavo Monitor

Índice canónico de documentación. Todo lo que estaba en `CLAUDE.md`, `project-rules.md`, `prompt.md`, `scraper-skill.md` y `villavo-frontend.md` fue consolidado aquí. `CLAUDE.md` de la raíz se mantiene (instrucciones `graphify`).

## Qué consultar, cuándo

| Documento | Cuándo usarlo | Contenido clave |
|-----------|---------------|-----------------|
| **[PRD.md](./PRD.md)** | Qué debe construir el proyecto (visión de producto). Para entender problema, usuarios, alcance, estados del agua y requisitos. | Problema EAAV Villavicencio, user stories, requisitos funcionales/no-funcionales, estados y semaforización, KPIs, fuera de alcance |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Cómo se estructura el sistema. Para navegar el monorepo y el flujo de datos. | Árbol monorepo, diagrama scraper→DB→API→frontend, stack detallado, schema Turso, decisiones de infraestructura |
| **[TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** | Contratos y comportamiento técnico. Para implementar o consumir APIs/DB/parser. | Specs de `GET /api/reports|sectores|summary`, tipos `EstadoServicio`, SQL, encoding, ENV, paleta, polling SWR |
| **[ENGINEERING_PRINCIPLES.md](./ENGINEERING_PRINCIPLES.md)** | Reglas que el agente (y humano) debe respetar al modificar código. Lectura obligatoria antes de tocar código. | 9 Reglas de Oro (`lessons_learned.md`), pnpm-only, App Router only, FK concurrency, TS en root, manejo de errores |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | Orden de construcción y Definition of Done. Para planificar hitos y verificar entregas. | Fases 1-8, estado ✓/en curso/pendiente, comandos de verificación por hito |

## Flujo de lectura recomendado

1. **Nuevo en el proyecto**: `README.md` (este archivo) → `PRD.md` → `ARCHITECTURE.md`
2. **Vas a codificar**: `ENGINEERING_PRINCIPLES.md` → `TECHNICAL_SPEC.md` → `IMPLEMENTATION_PLAN.md` (fase actual)
3. **Vas a debuggear scraper/DB**: `ARCHITECTURE.md` § Flujo Scraper + `TECHNICAL_SPEC.md` § DB Schema + `ENGINEERING_PRINCIPLES.md` § Protocolos Críticos
4. **Vas a tocar frontend**: `TECHNICAL_SPEC.md` § Frontend Contracts + `ARCHITECTURE.md` § Estructura `src/`

## Convenciones

- **Idioma**: español en documentación, términos técnicos en inglés cuando son más claros (`App Router`, `SWR`, `polling`, `UPSERT`, `FK`).
- **Fuente de verdad de memoria**: `.agent/memory-archive/` (`tech_stack.md`, `roadmap.md`, `session_log.md`, `lessons_learned.md`). `docs/` es la vista curada para humanos/agentes.
- **No sincronizar aún** `.agent/memory/` desde `memory-archive` — se hará en un hito posterior (ver `IMPLEMENTATION_PLAN.md` Hito 8).
- **Graphify**: ver `CLAUDE.md` en raíz y `graphify-out/GRAPH_REPORT.md` para consultas `graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concepto>"`.

## Estructura `docs/` (canónica)

```
docs/
├── README.md                  # este índice
├── PRD.md                    # qué debe construir
├── ARCHITECTURE.md           # cómo se estructura
├── TECHNICAL_SPEC.md         # contratos técnicos
├── ENGINEERING_PRINCIPLES.md # reglas al modificar código
└── IMPLEMENTATION_PLAN.md    # orden + Definition of Done
```

`README.md` raíz del repo (no en `docs/`) mantiene quickstart/setup — no duplicado aquí.
