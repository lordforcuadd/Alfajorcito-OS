# ARCHITECTURE DECISION RECORD: Alfajorcito OS

## 1. Contexto y Requisitos
El usuario necesita un Centro de Operaciones Académicas + Investigación + Segundo Cerebro con uso primordial en dispositivos móviles (smartphone) y tablets (iPad/Android), con capacidad para funcionar en cualquier entorno (bibliotecas, aulas sin wifi, transporte) de forma 100% offline, interactuar con fuentes académicas reales y sincronizarse con herramientas como Obsidian y Google Workspace.

### Requisitos No Funcionales Clave:
- **UX Móvil/Tablet**: Prioridad 10/10. Interacciones táctiles fluidas, touch targets ≥ 44px, gestos, Split View en tablets.
- **Offline-First**: Prioridad 10/10. Lectura, escritura, búsquedas locales, citación y toma de notas funcionales sin conexión a internet.
- **Rendimiento**: Prioridad 10/10. Carga instantánea (<1s), navegación sin lag, búsquedas sobre miles de notas y citas en <50ms.
- **Integraciones Reales**: Prioridad 10/10. OpenAlex, Crossref, Semantic Scholar, DOI.org, Obsidian Vault, Google Docs/Calendar/Drive, Canva.
- **Seguridad y Privacidad**: Prioridad 10/10. Los datos y credenciales residen en el cliente local; cero telemetría no deseada, cero exposición de API keys a terceros.
- **Mantenibilidad & Simplicidad**: Código modular en TypeScript, sin sobreingeniería de microservicios.

---

## 2. Evaluación de Alternativas Tecnológicas

### Matriz Comparativa de Arquitectura de Aplicación:

| Criterio (Peso) | Opción A: SPA/PWA Local-First (React 19 + Vite + Dexie.js) | Opción B: React Native / Expo Mobile App | Opción C: Fullstack Next.js SSR + PostgreSQL en Nube |
| :--- | :---: | :---: | :---: |
| **UX Móvil/Tablet (10)** | **9.5** (PWA instalable, diseño responsive, split view tablet) | **9.5** (Nativo iOS/Android, requiere tiendas para update) | **7.0** (Dependencia de latencia de red en móvil) |
| **Rendimiento (10)** | **10.0** (Cero latencia de red para datos locales, carga ultra rápida) | **9.0** (Bridge JS/Native overhead en tablet viewports) | **6.5** (Latencia de servidor en cada interacción) |
| **Offline-First (10)** | **10.0** (IndexedDB / Dexie.js nativo en navegador, Service Worker) | **8.5** (SQLite nativo con sincronización manual) | **4.0** (Requiere re-arquitectura compleja offline) |
| **Integraciones (10)** | **10.0** (CORS amigable con Crossref/OpenAlex/Semantic Scholar, File System Access API) | **7.5** (Restricciones sandbox de File System en iOS) | **8.0** (Proxy server obligatorio para todo) |
| **Mantenibilidad (10)** | **9.5** (Un único código fuente web estándar, fácil de auditar) | **7.5** (Mantenimiento de builds iOS/Android/XCode/Gradle) | **7.0** (Mantenimiento de infraestructura cloud + DB) |
| **Seguridad / Privacidad (10)** | **10.0** (Datos residen en el dispositivo del usuario, BYOK) | **9.0** (Datos en sandbox local) | **6.0** (Datos personales y tokens en servidor central) |
| **Simplicidad (9)** | **9.5** (Despliegue estático, sin DevOps complejos) | **6.5** (Compilaciones nativas, emuladores) | **6.0** (Docker, migraciones SQL, hosting) |
| **Escalabilidad (8)** | **9.0** (Cero coste de servidor por usuario, escala ilimitadamente) | **9.0** (Cliente nativo) | **7.0** (Costes de compute y base de datos proporcionales) |
| **Coste (8)** | **10.0** ($0 de infraestructura fija para el usuario) | **8.0** (Licencias Apple Developer / Google Play) | **5.0** (Hosting VPS/Supabase/Vercel recurrente) |
| **Ecosistema (8)** | **10.0** (El mayor ecosistema de librerías JS/TS, PWA estándar) | **8.0** (Ecosistema móvil React Native) | **9.0** (Ecosistema Node/React) |
| **Experiencia Dev (7)** | **10.0** (HMR instantáneo en Vite, depuración en DevTools) | **7.5** (Metro bundler, reinicios en emulador) | **8.5** (Turbopack / Next.js) |
| **PUNTUACIÓN TOTAL** | **98.0 / 100** 🏆 | **82.5 / 100** | **68.0 / 100** |

---

## 3. Decisión de Stack Tecnológico

### Capa Frontend & UI:
- **Framework**: React 19 + TypeScript.
- **Build Tool**: Vite 6 con plugin `@vitejs/plugin-react` y `vite-plugin-pwa`.
- **Styling**: Tailwind CSS v4 + Vanilla CSS Custom Properties para la paleta pastel académica de alta especificidad.
- **Iconografía**: `lucide-react` para iconografía limpia, consistente y accesible.
- **Grafo de Conocimiento**: Motor de renderizado basado en HTML5 Canvas 2D con simulación de fuerzas (Force Simulation) para visualización de relaciones interconectadas fluida en móviles.

### Capa de Datos & Almacenamiento (Local-First):
- **Motor de Base de Datos**: **Dexie.js (IndexedDB wrapper)**.
- **Ventajas**:
  - Reactividad nativa con `useLiveQuery` de React.
  - Almacenamiento estructurado de esquemas relacionales completos sin sobrecarga de SQL binario.
  - Capacidad para almacenar decenas de miles de fuentes, notas y borradores en el dispositivo sin límite artificial de 5MB (a diferencia de LocalStorage).
  - Capacidades de exportación e importación de JSON completo para backups sin fricción.

### Motor de Integraciones Académicas:
- **Crossref REST API** (`api.crossref.org`): Consulta de DOI, metadatos estructurados de artículos y libros.
- **OpenAlex API** (`api.openalex.org`): Metadatos masivos, resúmenes invertidos, autores, conceptos y conteo de citas.
- **Semantic Scholar API** (`api.semanticscholar.org`): Búsqueda semántica, papers influyentes, abstracts y TLDRs.
- **DOI.org Content Negotiation**: Normalización automática a `application/vnd.citationstyles.csl+json` y BibTeX.

### Motor de Segundo Cerebro & Obsidian:
- **Sintaxis**: Markdown compatible con CommonMark + extensiones Obsidian (`[[wikilinks]]`, tags `#tag`, bloques de código y Callouts).
- **YAML Frontmatter**: Inclusión de metadata estructurada (`id`, `title`, `type`, `course`, `work`, `tags`, `sources`, `created`, `updated`).
- **Exportación**: Generación de paquetes ZIP estructurados por carpetas PARA (`Projects/`, `Areas/`, `Resources/`, `Archive/`, `Sources/`, `Atomic/`) compatibles de inmediato con cualquier bóveda de Obsidian.
- **Obsidian Local REST API Connector**: Capacidad de sincronización directa mediante HTTPS local (`localhost:27124`) cuando el plugin de Obsidian está activo en el dispositivo.

### Motor de IA Contextual & Anti-Alucinación:
- **Patrón BYOK (Bring Your Own Key)**: Soporte directo para Google Gemini API, OpenAI API, Anthropic API, OpenRouter y Ollama local.
- **Motor Heurístico Offline**: Algoritmos de reglas deterministas para análisis sintáctico de instrucciones, cálculo de antigüedad de fuentes, formateo de citas APA/MLA/IEEE/Chicago/Vancouver y detección de campos faltantes sin requerir conexión ni consumo de tokens.
- **Regla Anti-Alucinación Estricta**: Marcado imperativo de datos ausentes como `DATO NO VERIFICADO`.

---

## 4. Arquitectura de Componentes y Flujo de Datos

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ALFAJORCITO OS (PWA)                            │
├────────────────────────────────────────────────────────────────────────┤
│  UI LAYER (React 19 + Tailwind CSS + Pastel Design System)             │
│  ┌───────────────────────┬───────────────────────┬──────────────────┐  │
│  │ Mobile BottomNav /    │ Tablet SplitView /    │ Global Overlays  │  │
│  │ Touch Views (≤768px)  │ Master-Detail (>768px)│ (+ Capture, 🔍) │  │
│  └───────────────────────┴───────────────────────┴──────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  DOMAIN MODULES & WORKSPACES                                           │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────────┐  │
│  │  Dashboard   │  Workspace   │  Research &  │   Second Brain      │  │
│  │  (8 Qs Hub)  │  Trabajos    │  Fuentes     │   (Notas & Grafo)   │  │
│  ├──────────────┼──────────────┼──────────────┼─────────────────────┤  │
│  │  Trazabilidad│  Consultas   │  Citas &     │   Integraciones     │  │
│  │  (Pipeline)  │  Profesor    │  Referencias │   (Obsidian/Google) │  │
│  └──────────────┴──────────────┴──────────────┴─────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  SERVICES & ENGINES LAYER                                              │
│  ┌────────────────────────┬─────────────────────────────────────────┐  │
│  │ Citation Engine        │ Academic API Client (Crossref/OpenAlex) │  │
│  │ (APA 7, MLA, IEEE, etc)│ Anti-Hallucination Metadata Validator   │  │
│  ├────────────────────────┼─────────────────────────────────────────┤  │
│  │ Obsidian Vault Exporter│ AI Context Engine (BYOK + Offline Rules)│  │
│  └────────────────────────┴─────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER (Dexie.js / IndexedDB) - LOCAL-FIRST & OFFLINE             │
│  [Courses] [Works] [Instructions] [Inquiries] [Sources] [Ideas]        │
│  [Paraphrases] [Citations] [References] [Notes] [Concepts] [Tasks]     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Riesgos y Mitigaciones
1. **Límites de almacenamiento en IndexedDB móvil**:
   - *Mitigación*: IndexedDB soporta hasta gigabytes en navegadores modernos. Se implementa compresión de texto y exportación de backups en JSON/ZIP para preservación permanente.
2. **APIs académicas con Rate Limiting o CORS**:
   - *Mitigación*: OpenAlex y Crossref soportan CORS directamente desde navegadores. Para llamadas con rate-limit, se implementa caché local indexada de todas las consultas realizadas.
3. **Pérdida de datos accidental del usuario**:
   - *Mitigación*: Sistema de backup automático a archivo local con un clic y exportación directa de toda la base de datos a formato JSON legible y Obsidian Vault.
