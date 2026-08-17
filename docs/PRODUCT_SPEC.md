# PRODUCT SPECIFICATION: Alfajorcito OS

## 1. Misión y Visión
Transformar el flujo de estudio, investigación y redacción académica en una experiencia unificada, ágil, sin distracciones y epistemológicamente rigurosa. Alfajorcito OS no es un simple gestor de tareas ni un lector de PDFs: es una central de comando que asegura que cada afirmación académica esté debidamente respaldada por fuentes verificadas y que el conocimiento adquirido no se deseche al terminar el semestre, sino que se acumule de forma permanente en un segundo cerebro interconectado.

---

## 2. Personas y Casos de Uso

### Persona Principal:
- **Estudiante Universitario / Investigador**:
  - Lee indicaciones complejas de proyectos de investigación, ensayos y tesis.
  - Necesita desglosar rúbricas y consignas sin omitir ningún requerimiento del profesor.
  - Formula dudas formales a los docentes y necesita documentar las respuestas como directrices vinculantes.
  - Busca fuentes fiables en bases académicas internacionales.
  - Debe citar rigurosamente sin cometer plagio accidental (respetando la cadena: *Idea original → Paráfrasis propia → Cita en texto → Entrada bibliográfica*).
  - Utiliza smartphones y tablets para leer y redactar notas en cualquier momento.

---

## 3. Módulos y Requerimientos Funcionales

### M1. Dashboard Operativo (8 Preguntas Clave)
Debe responder instantáneamente sin carga cognitiva:
1. **¿Qué debo hacer hoy?**: Tareas urgentes con vencimiento en las próximas 24 horas y checklist prioritario de entregables.
2. **¿Qué se acerca?**: Entregas, exámenes y presentaciones en los próximos 7 a 14 días con cuenta regresiva.
3. **¿Qué está atrasado?**: Alertas en rojo de tareas y entregas superadas sin marcar como completadas.
4. **¿Qué está bloqueado?**: Dudas enviadas a profesores pendientes de respuesta que detienen el avance de un trabajo.
5. **¿Qué estoy investigando?**: Trabajos activos en fase de investigación bibliográfica con conteo de fuentes.
6. **¿Qué investigué recientemente?**: Últimas fuentes agregadas o verificadas con acceso rápido a sus notas.
7. **¿Qué debo revisar?**: Paráfrasis marcadas como "Pendiente de revisión", citas sin página o fuentes con `UNVERIFIED`.
8. **¿Qué aprendí recientemente?**: Últimos conceptos y notas atómicas añadidas al segundo cerebro.

### M2. Workspace de Trabajos Académicos (Assignment Workspaces)
Cada trabajo académico cuenta con un espacio de trabajo integral:
- **Metadatos del Trabajo**: Título, Curso, Profesor, Fecha límite, Formato de entrega, Estilo de citación obligatorio (APA 7, MLA 9, IEEE, Chicago, Vancouver), Año máximo de publicación de fuentes.
- **Desglose de Instrucciones**:
  - Separación visual e inequívoca entre **Requisitos Explícitos del Profesor** e **Interpretaciones / Sugerencias de IA**.
  - Rúbrica desglosada en checklist interactivo.
- **Consultas con el Profesor**:
  - Registro de dudas, redacción de preguntas formales (con ayuda de IA para estructurar respetuosamente), registro de fecha de consulta, respuesta oficial del docente y adjuntos de evidencia.
  - La respuesta del profesor anula o complementa cualquier sugerencia previa.
- **Control de Antigüedad de Fuentes**:
  - Indicadores automáticos: 🟢 Cumple año máximo, 🟡 Requiere justificación, 🔴 No cumple.
  - Posibilidad de marcar una fuente antigua como "Aprobada por profesor como contexto histórico".
- **Borrador y Feedback**:
  - Editor de redacción integrado con inserción de citas de 1-clic.
  - Registro de observaciones y correcciones del profesor con histórico de versiones.

### M3. Búsqueda y Biblioteca de Fuentes (Academic Research Hub)
- **Búsqueda Académica Integrada**:
  - Consultas en vivo a OpenAlex, Crossref y Semantic Scholar.
  - Búsqueda por DOI directo con resolución instantánea de metadatos CSL-JSON.
- **Estados de Verificación Estricta**:
  - `VERIFIED`: Todos los metadatos esenciales (autores, año, título, publicación/journal, DOI/URL) comprobados con base oficial.
  - `PARTIALLY_VERIFIED`: Se tiene título y autor pero falta volumen, páginas o DOI confirmado.
  - `UNVERIFIED`: Entrada manual o importada sin verificar en bases académicas.
- **Regla Anti-Alucinación**:
  - Ningún campo faltante se completa con suposiciones. En su lugar se muestra la insignia `DATO NO VERIFICADO`.

### M4. Trazabilidad Académica y Paráfrasis (Epistemological Pipeline)
- Registro estructurado de la cadena:
  $$\text{Fuente} \longrightarrow \text{Idea Extraída} \longrightarrow \text{Paráfrasis Propia} \longrightarrow \text{Cita en Texto} \longrightarrow \text{Referencia Bibliográfica}$$
- Cada registro de paráfrasis almacena:
  - Cita textual original y número de página/sección.
  - Idea principal condensada.
  - Interpretación propia del estudiante.
  - Paráfrasis final con verificación de fidelidad (asistida por IA con advertencia de confirmación humana).
  - Generación automática de cita narrativa `(Pérez, 2023, p. 45)` o parentética `(Pérez, 2023)`.

### M5. Motor de Citación y Referencias
- Soporte determinista y conforme a manuales oficiales para:
  - **APA 7ma Edición**: Formato de autor, año, título en cursiva, fuente y DOI con prefijo https://doi.org/...
  - **MLA 9na Edición**: Formato de contenedor, ubicación, autores invertidos.
  - **IEEE**: Citación numérica entre corchetes `[1]` con orden de aparición o alfabético.
  - **Chicago**: Estilos Autor-Fecha y Notas/Bibliografía.
  - **Vancouver**: Citación médica numérica con abreviaturas de revistas estándar.
- Exportación en formatos CSL-JSON, BibTeX y texto plano con sangría francesa automática.

### M6. Segundo Cerebro y Notas Atómicas (Obsidian Compatible)
- Estructura de notas Zettelkasten y PARA (Proyectos, Áreas, Recursos, Archivos).
- Soporte para enlaces bidireccionales `[[Nombre de Nota]]`, autocompletado y backlinks inversos.
- Grafo de conocimiento interactivo con filtrado por tipo de nodo:
  - `Curso` (Azul / Lavanda)
  - `Trabajo` (Rosa empolvado)
  - `Concepto` (Menta)
  - `Nota` (Crema / Ámbar)
  - `Fuente` (Púrpura suave)
  - `Autor` (Gris cálido)
- Exportador de Vault completo a ZIP con carpetas organizadas y archivos `.md` limpios con YAML frontmatter.

### M7. Captura Rápida Global (`+`) y Búsqueda Omnipresente (Ctrl+K)
- Botón flotante accesible con una sola mano en móvil para capturar en menos de 3 segundos:
  - Nueva Nota
  - Nuevo Trabajo
  - Nueva Fuente (por DOI o URL)
  - Nueva Idea rápida
  - Nueva Tarea / Recordatorio
  - Nueva Pregunta a Profesor
- Buscador con índice local instantáneo con resaltado de coincidencias y filtros por categoría.

---

## 4. Criterios de Aceptación Globales
1. **Offline Completo**: La aplicación puede recargarse sin conexión a internet y permitir crear, editar y consultar todas las notas, fuentes y trabajos.
2. **Cero Plagio Involuntario**: Toda cita insertada en un borrador debe estar ligada a su fuente original y paráfrasis documentada.
3. **Cero Alucinaciones en Metadatos**: El sistema nunca inventará campos bibliográficos ausentes.
4. **Respuesta Rápida**: Búsqueda global en menos de 50ms para 1,000 registros locales.
5. **Cumplimiento de Accesibilidad**: Contraste WCAG AA en toda la paleta pastel y tamaño mínimo de botones interactivos de 44x44 píxeles.
