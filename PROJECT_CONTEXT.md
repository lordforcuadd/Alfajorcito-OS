# PROJECT CONTEXT: Alfajorcito OS

## 1. Visión del Producto
**Alfajorcito OS** es un Centro de Operaciones Académicas + Investigación + Segundo Cerebro con enfoque *Local-First* y *Mobile-First*, diseñado para acompañar el ciclo de vida epistemológico completo del estudiante e investigador:
`Instrucciones → Análisis → Dudas con Profesor → Investigación → Evaluación de Fuentes → Ideas → Paráfrasis → Citas → Referencias → Redacción → Feedback → Corrección → Entrega → Conocimiento Permanente Reutilizable`.

## 2. Principios Rectores
1. **Veracidad y Regla Anti-Alucinación**: Jamás inventar autores, DOI, revistas, páginas o citas. Toda metadata incompleta o no contrastada se etiqueta explícitamente como `DATO NO VERIFICADO` o `PARTIALLY_VERIFIED`.
2. **Prioridad Epistemológica Canónica**: La respuesta o instrucción oficial del docente tiene jerarquía superior a cualquier inferencia generada por IA.
3. **Trazabilidad Continua**: Cada afirmación relevante en un trabajo debe ser rastreable en la cadena *Source → Idea → Paraphrase → Citation → Reference → Work*.
4. **Local-First & Resiliencia Offline**: Los datos pertenecen al usuario, residen en almacenamiento local (IndexedDB) con soporte PWA, y el sistema es 100% operativo sin conexión.
5. **Compatibilidad con Obsidian**: Las notas, fuentes y conceptos siguen una estructura atómica y enlazada (`[[wikilinks]]`, tags, YAML frontmatter) exportable y sincronizable directamente con vaults de Obsidian.
6. **Diseño Visual Pastel Premium & Accesibilidad**: Paleta basada en tonos rosa empolvado, lavanda, crema y pizarra profunda con cumplimiento estricto WCAG AA (contraste ≥ 4.5:1, touch targets ≥ 44px).

## 3. Stack Tecnológico Aprobado
- **Frontend Core**: React 19 + TypeScript + Vite.
- **Estilos & Diseño**: Tailwind CSS v4 + Vanilla CSS Custom Properties (Design Tokens con paleta pastel accesible).
- **Almacenamiento Local**: Dexie.js (IndexedDB v3/v4 wrapper reactivo con `useLiveQuery`).
- **Iconografía & Gráficos**: Lucide React + Visx / Force Graph Canvas para el grafo de conocimiento.
- **Motor de Citación**: Algoritmo determinista de estilos de citación (APA 7, MLA 9, IEEE, Chicago, Vancouver) + Parser CSL-JSON / BibTeX.
- **Integraciones Académicas**: Conexión directa a APIs públicas (Crossref, OpenAlex, Semantic Scholar, DOI.org).
- **Integraciones Externas**: Google Docs (Export/Web OAuth), Google Calendar (.ics/Intents), Canva (Deep Linking), Obsidian (Local REST API / Vault Exporter).
- **IA Contextual**: Arquitectura multimodelo (BYOK: Gemini, OpenAI, OpenRouter, Ollama local) con fallback heurístico offline.

## 4. Estructura de Directorios
```text
Alfajorcito OS/
├── docs/                      # Documentación arquitectónica y funcional
├── public/                    # PWA Manifest, iconos, animaciones WebP/WebM de mascota
├── src/
│   ├── assets/                # Imágenes, logos, texturas
│   ├── components/            # Componentes UI reutilizables
│   │   ├── common/            # Buttons, Inputs, Cards, Badges, Modals, Toasts
│   │   ├── layout/            # AppShell (Sidebar, BottomNav, Mascota Reactiva)
│   │   ├── modals/            # QuickCaptureModal, CommandPalette, SettingsModal
│   │   └── academic/          # Trazabilidad, Lector de fuentes, CitationPreview
│   ├── db/                    # Esquema Dexie.js (index.ts) y datos demo (seed.ts)
│   ├── modules/               # Módulos de dominio de la aplicación
│   │   ├── dashboard/         # Dashboard operativo (las 8 preguntas)
│   │   ├── works/             # Gestor de Trabajos Académicos, Workspaces y Redacción
│   │   ├── curriculum/        # Plan de Estudios, Malla Curricular y Progreso USMP
│   │   ├── research/          # Búsqueda académica y Biblioteca de Fuentes
│   │   ├── citations/         # Trazabilidad de Citas (Source → Idea → Paraphrase → Citation)
│   │   └── notes/             # Segundo Cerebro (P.A.R.A.), Notas Atómicas y Grafo
│   ├── services/              # Clientes de API externa (OpenAlex, Crossref, Semantic Scholar, AI)
│   ├── types/                 # Definiciones de TypeScript canónicas
│   ├── utils/                 # Formateadores de citas, sanitizadores, exportadores (Obsidian/Google)
│   ├── tests/                 # Suites de pruebas automatizadas (Vitest)
│   ├── App.tsx                # Entrada principal y enrutador de pestañas
│   ├── index.css              # Tokens CSS, tema Tailwind v4 y animaciones
│   └── main.tsx               # Montaje React y registro PWA
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 5. Convenciones de Código y Arquitectura
- Tipado estricto en TypeScript sin uso de `any`.
- Inmutabilidad en transformaciones de estado y manejo de datos.
- Todo texto visible en interfaz en idioma Español neutro académico.
- Componentes modulares con props explícitas y accesibilidad aria integrada.
- Sin dependencias pesadas innecesarias; preferir algoritmos claros y testeados.
