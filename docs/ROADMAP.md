# ROADMAP: Alfajorcito OS

## Fase 0: Descubrimiento y Arquitectura (Completada ✅)
- [x] Inspección integral del entorno y definición de principios.
- [x] Elaboración de `PROJECT_CONTEXT.md` y suite completa de documentos en `docs/`.
- [x] Selección justificada de stack (React 19 + TypeScript + Vite + Dexie.js + Tailwind CSS).

## Fase 1: Capa de Datos & Dominio (Completada en Plan ✅)
- [x] Definición de tipos TypeScript canónicos para todas las 11 entidades.
- [x] Creación del esquema IndexedDB con Dexie.js y reactividad con `useLiveQuery`.
- [x] Repositorios con soporte de transacciones y búsquedas indexadas.

## Fase 2: Design System & Mobile/Tablet Shell (En Curso 🚀)
- [x] Configuración de tokens CSS de diseño pastel académico accesible.
- [x] Componentes de interfaz: Cards, Badges de verificación, Buttons, Modals, SplitView.
- [x] Shell responsive con Bottom Navigation para móviles y Sidebar / Split View para Tablets.
- [x] Modal de Captura Rápida Global (`+`) y Command Palette / Búsqueda Global (`Ctrl+K`).

## Fase 3: Módulos de Dominio Académico (En Curso 🚀)
- [x] **Dashboard Operativo**: Resolución de las 8 preguntas directas.
- [x] **Gestor de Trabajos**: Desglose de instrucciones (Oficial vs IA), Rúbrica/Checklist, Consultas con profesor.
- [x] **Búsqueda e Investigación**: Integración OpenAlex / Crossref / Semantic Scholar / DOI resolver.
- [x] **Trazabilidad & Citas**: Pipeline *Fuente → Idea → Paráfrasis → Cita → Referencia*, estilos APA 7, MLA 9, IEEE, Chicago, Vancouver.
- [x] **Segundo Cerebro**: Notas atómicas con `[[wikilinks]]`, tags, YAML frontmatter y visualizador interactivo de Grafo de Conocimiento.

## Fase 4: Integraciones Externas y Herramientas (En Curso 🚀)
- [x] Exportador e Importador de Vaults de Obsidian (.zip).
- [x] Exportador para Google Docs con sangría francesa y Google Calendar (.ics/Intents).
- [x] Vinculación de plantillas de Canva.
- [x] Asistente de IA Contextual BYOK con motor heurístico offline de respaldo.

## Fase 5: Testing, Auditoría y Empaquetado PWA (Finalización 🎯)
- [ ] Suite de pruebas unitarias con Vitest.
- [ ] Auditoría de accesibilidad WCAG AA, rendimiento y seguridad.
- [ ] Service Worker para caching offline total.
