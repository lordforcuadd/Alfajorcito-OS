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

### 2.2. Pruebas de Integración y Base de Datos (Dexie Mock / In-Memory IndexedDB)
- Creación en cascada y trazabilidad: `Source -> Idea -> Paraphrase -> Citation -> Reference -> Work`.
- Búsqueda global full-text con filtros.
- Exportación e importación de copias de seguridad completas en formato JSON y validación de integridad.

### 2.3. Pruebas de Flujos de Usuario (15 User Journeys)
1. **Flujo 1**: Creación de Curso y Trabajo Académico.
2. **Flujo 2**: Registro de consignas e instrucciones del trabajo.
3. **Flujo 3**: Análisis de requisitos con separación explícita de consignas oficiales vs inferencias.
4. **Flujo 4**: Registro de duda y formulación de pregunta formal al docente.
5. **Flujo 5**: Búsqueda académica e importación de fuente desde OpenAlex / Crossref / DOI.
6. **Flujo 6**: Verificación de metadatos y estado `VERIFIED`.
7. **Flujo 7**: Extracción de idea y redacción de paráfrasis con aviso de fidelidad.
8. **Flujo 8**: Generación de cita en texto narrativa y parentética (APA 7).
9. **Flujo 9**: Generación de referencia bibliográfica con sangría francesa.
10. **Flujo 10**: Creación de nota atómica en el Segundo Cerebro con `[[wikilinks]]`.
11. **Flujo 11**: Exploración de conexiones en el Grafo de Conocimiento.
12. **Flujo 12**: Exportación de borrador y referencias a formato Google Docs / Markdown.
13. **Flujo 13**: Registro de feedback del profesor tras revisión preliminar.
14. **Flujo 14**: Marcado de entrega de trabajo y actualización de métricas del Dashboard.
15. **Flujo 15**: Exportación de la base de conocimiento a Vault de Obsidian (.zip).

---

## 3. Matriz de Auditoría de Rendimiento y Accesibilidad
- **Tiempo de Carga Inicial**: < 1.0 segundo en red 4G simulada.
- **Tiempo de Búsqueda Global**: < 50 ms sobre 1,000 registros indexados.
- **Accesibilidad**: Criterios WCAG 2.1 AA cumplidos en contraste, navegación por teclado y etiquetas aria.
