# TESTING & QUALITY ASSURANCE SPECIFICATION: Alfajorcito OS

## 1. Estrategia de Pruebas
Alfajorcito OS implementa una suite de pruebas multi-nivel para asegurar la fiabilidad absoluta de los algoritmos de citación, la integridad del modelo de datos local, la reactividad de la interfaz y la resiliencia offline.

---

## 2. Niveles de Pruebas

### 2.1. Suites de Pruebas Unitarias Automatizadas (Vitest)
1. **`src/tests/citationEngine.test.ts`**:
   - Verificación de formateo básico APA 7, MLA 9, IEEE, Chicago y Vancouver.
2. **`src/tests/citationEngineExtended.test.ts`**:
   - Pruebas rigurosas de 1, 2, 3+ y 21+ autores (regla elipsis APA 7).
   - Manejo de fuentes sin año (`s.f.`).
   - Citas numeradas IEEE y Vancouver con `referenceNumber` dinámico.
   - Formato enriquecido HTML con cursivas para libros y revistas en los 5 estilos.
   - Soporte para `BOOK_CHAPTER` ("En *Libro*, pp. X-Y") y `CHICAGO_NOTES`.
3. **`src/tests/antiHallucination.test.ts`**:
   - Auditoría de metadatos científicos (`VERIFIED`, `PARTIALLY_VERIFIED`, `UNVERIFIED`).
   - Regla estricta anti-alucinación y sanitización de texto académico.
4. **`src/tests/instructionAnalyzer.test.ts`**:
   - Análisis heurístico de consignas de trabajos y detección de estructura de rúbricas.
5. **`src/tests/exporters.test.ts`**:
   - Exportación de Vault estructurado para Obsidian con YAML frontmatter y sanitización de tags.
   - Exportación HTML enriquecida para Google Docs con portada oficial USMP y escape seguro.
6. **`src/tests/securityAndResilience.test.ts`**:
   - Validación de esquema estricto en importación de copias de seguridad JSON.
   - Escape de inyecciones HTML/XSS en títulos, resúmenes y autores.

### 2.2. Cobertura de Código Automatizada (v8)
- Ejecutable mediante: `npm run test:coverage` (alimentado por `@vitest/coverage-v8`).
- Cubre motores de citación, validadores de metadatos científicos, exportadores de Obsidian/Google Docs, resiliencia de seguridad y análisis heurístico offline.

---

## 3. Matriz de Verificación Manual (15 User Journeys)
La validación interactiva de interfaz y reactividad de IndexedDB se realiza sobre el siguiente checklist de escenarios de aceptación:

1. **Flujo 1**: Creación de Curso y Trabajo Académico con selector de fecha límite.
2. **Flujo 2**: Registro de consignas e instrucciones del trabajo.
3. **Flujo 3**: Análisis offline de requisitos con separación explícita de consignas oficiales vs inferencias.
4. **Flujo 4**: Registro de dudas y formulación asistida de preguntas formales al docente.
5. **Flujo 5**: Búsqueda académica e importación de fuente desde OpenAlex / Crossref / DOI.
6. **Flujo 6**: Verificación de metadatos, estado `VERIFIED` y control de antigüedad máxima.
7. **Flujo 7**: Extracción de idea y redacción de paráfrasis con estado `PENDING_REVIEW`.
8. **Flujo 8**: Generación de cita en texto narrativa y parentética (APA 7, MLA 9, IEEE, Chicago, Vancouver).
9. **Flujo 9**: Generación de referencia bibliográfica con sangría francesa y copiado enriquecido.
10. **Flujo 10**: Creación de nota atómica en el Segundo Cerebro con `[[wikilinks]]`.
11. **Flujo 11**: Exploración de conexiones en el Grafo de Conocimiento interactivo.
12. **Flujo 12**: Exportación de borrador y referencias a formato Google Docs (HTML enriquecido).
13. **Flujo 13**: Registro de feedback del profesor tras revisión preliminar.
14. **Flujo 14**: Marcado de entrega de trabajo y actualización inmediata de métricas en Dashboard.
15. **Flujo 15**: Exportación completa de la base de conocimiento a Vault de Obsidian (.zip).

---

## 4. Criterios de Rendimiento y Accesibilidad Manual
- **Tiempo de Carga Inicial**: < 1.0 segundo en red estándar y carga instantánea vía Service Worker PWA offline.
- **Rendimiento de Búsqueda**: Filtrado inmediato sobre tablas IndexedDB locales indexadas.
- **Accesibilidad e Interfaz**: Contraste verificado para paleta pastel/pizarra, soporte de etiquetas `aria-label` en controles interactivos y navegación mediante atajos de teclado (`Ctrl+K`).
