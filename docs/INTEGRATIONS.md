# INTEGRATIONS SPECIFICATION: Alfajorcito OS

## 1. Integraciones Académicas Primarias (CORS Ready)

### 1.1. Crossref REST API (`api.crossref.org`)
- **Propósito**: Obtención de metadatos oficiales de artículos con DOI, libros y actas de congresos.
- **Endpoint**: `https://api.crossref.org/works/{doi}`
- **Campos normalizados**:
  - `title` -> `title[0]`
  - `authors` -> `author[]` (mapeado a `firstName` / `lastName`)
  - `year` -> `published['date-parts'][0][0]`
  - `container-title` -> `publication`
  - `volume`, `issue`, `page`
- **Cabecera 'Polite Pool'**: Incluir `mailto:alfajorcito-user@app.local` en User-Agent para mayor velocidad y límite de tasa ampliado.

### 1.2. OpenAlex API (`api.openalex.org`)
- **Propósito**: Búsqueda académica abierta sobre 250M+ de trabajos científicos, conceptos y citaciones.
- **Endpoint de búsqueda**: `https://api.openalex.org/works?search={query}&per_page=10`
- **Ventajas**: Resúmenes invertidos decodificados, conteo de citas directas, tópicos clasificados y acceso a PDFs abiertos vía Unpaywall.

### 1.3. Semantic Scholar Academic Graph API (`api.semanticscholar.org`)
- **Propósito**: Búsqueda por lenguaje natural y resumen en una frase (TLDR).
- **Endpoint**: `https://api.semanticscholar.org/graph/v1/paper/search?query={query}&fields=title,authors,year,abstract,tldr,venue,citationCount`

### 1.4. DOI.org Content Negotiation
- **Propósito**: Resolución directa de cualquier DOI a formato CSL-JSON oficial o BibTeX.
- **Endpoint**: `https://doi.org/{doi}` con cabecera `Accept: application/vnd.citationstyles.csl+json`.

---

## 2. Integración con Obsidian (Segundo Cerebro)

### 2.1. Exportador Universal de Vault (.zip)
- Genera un archivo ZIP descargable con estructura de carpetas jerárquica:
  - `00_Inbox/`: Ideas y capturas rápidas
  - `01_Projects/`: Trabajos académicos activos (cada uno con su nota principal y enlaces a fuentes)
  - `02_Areas/`: Asignaturas / Cursos
  - `03_Resources/`: Biblioteca de Fuentes Académicas y Fichas Bibliográficas
  - `04_Atomic_Notes/`: Conceptos y notas de conocimiento interconectadas
  - `05_Archive/`: Trabajos y cursos culminados
- Formato de cada archivo `.md`:
  ```markdown
  ---
  id: "uuid-1234"
  title: "Constructivismo y Aprendizaje Significativo"
  type: "concept"
  course: "[[Metodología de la Investigación]]"
  sources:
    - "[[Ausubel 2000 - Adquisición y retención del conocimiento]]"
  tags:
    - "#epistemologia"
    - "#educacion"
  created: "2026-08-15"
  updated: "2026-08-15"
  ---

  # Constructivismo y Aprendizaje Significativo

  Texto de la nota con enlaces bidireccionales como [[Ausubel 2000]] y conceptos relacionados.
  ```

### 2.2. Obsidian Local REST API Connector
- Protocolo opcional para usuarios con el plugin `Local REST API` activo en su Obsidian desktop/móvil:
  - Puerto por defecto: `https://127.0.0.1:27124`
  - Métodos soportados: `PUT /vault/{path}`, `GET /vault/{path}`, `POST /periodic/daily/`

---

## 3. Integración con Google Workspace

### 3.1. Google Docs
- **Exportador a Formato Google Docs / Markdown Estructurado**:
  - Generación de estructura completa de borrador con títulos, citas en texto con formato académico y lista de Referencias Bibliográficas con sangría francesa.
  - Copiado en un clic al portapapeles con formato Rich Text (HTML) para pegar directamente en Google Docs manteniendo negritas, cursivas y formato de citas.
- **Enlace Bidireccional**: Vinculación de la URL del Google Doc del trabajo para apertura inmediata.

### 3.2. Google Calendar (.ics / Web Intents)
- Generación de enlaces de sincronización de eventos de entrega:
  - `https://calendar.google.com/calendar/render?action=TEMPLATE&text=ENTREGA:+{title}&dates={start}/{end}&details={details}`
  - Exportación de archivo universal `.ics` con todos los hitos y plazos académicos para importar en Google Calendar, Apple Calendar o Outlook.

### 3.3. Canva
- Almacenamiento y apertura de enlace profundo a plantillas de diapositivas o pósters científicos en Canva vinculados al trabajo.

---

## 4. Proveedores de Inteligencia Artificial (BYOK Contextual)

### 4.1. Proveedores Soportados
1. **Google Gemini API**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
2. **OpenAI API**: `https://api.openai.com/v1/chat/completions` (GPT-4o-mini / GPT-4o)
3. **Anthropic API**: `https://api.anthropic.com/v1/messages` (Claude 3.5 Haiku / Sonnet)
4. **OpenRouter API**: Agregador multimodelo con acceso a modelos abiertos como Llama 3.3 y DeepSeek R1.
5. **Ollama Local**: `http://localhost:11434/api/generate` (Cero costes, 100% privado y offline).

### 4.2. Motor Heurístico Offline (Fallback Automático)
- Cuando no se configure API key o no haya conexión:
  - Algoritmo de extracción sintáctica de consignas (busca palabras clave: "entregar", "formato", "páginas", "fuentes", "máximo", "fecha").
  - Detector de antigüedad de fuentes basado en año actual y límites configurados.
  - Formateador y validador de citas y referencias basado en reglas CSL puras en JavaScript.
