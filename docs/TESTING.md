# TESTING & QUALITY ASSURANCE SPECIFICATION: Alfajorcito OS

## 1. Estrategia de Pruebas
Alfajorcito OS implementa una suite de pruebas multi-nivel para asegurar la fiabilidad absoluta de los algoritmos de citación, la integridad del modelo de datos local, la reactividad de la interfaz y la resiliencia offline.

---

## 2. Niveles de Pruebas

### 2.1. Pruebas Unitarias (Vitest)
- **Motor de Citación**:
  - Verificación de formato APA 7 (artículo con 1, 2 y >3 autores, libro, capítulo de libro con DOI).
  - Verificación de formato MLA 9 (autores invertidos, contenedor, páginas).
  - Verificación de formato IEEE (estilo numérico).
  - Verificación de formato Chicago y Vancouver.
- **Validador de Antigüedad de Fuentes**:
  - Detección de fuentes mayores a $N$ años respecto a la fecha del trabajo.
  - Comportamiento de excepciones para fuentes marcadas con contexto histórico aprobado.
- **Normalizador de Metadatos y Anti-Alucinación**:
  - Marcado de campos vacíos con `DATO NO VERIFICADO`.
  - Conversión de CSL-JSON a entidades internas de Alfajorcito OS.
- **Generador de Vault de Obsidian**:
  - Verificación de YAML frontmatter, estructura PARA y wikilinks bidireccionales.

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
