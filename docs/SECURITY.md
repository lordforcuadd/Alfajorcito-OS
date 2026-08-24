# SECURITY & PRIVACY SPECIFICATION: Alfajorcito OS

## 1. Principio de Cero Confianza y Privacidad por Diseño
Alfajorcito OS está concebido con un modelo de seguridad centrado en el usuario:
- **Almacenamiento Exclusivamente Local**: Todas las notas, trabajos, borradores y fuentes residen en el IndexedDB local del navegador del usuario.
- **Sin Servidor Intermediario Propietario**: No existe un backend remoto recolectando datos personales, hábitos de estudio o consultas académicas.
- **Cero Telemetría**: Ningún dato se envía a terceros sin una acción explícita del usuario (como solicitar una búsqueda en OpenAlex o ejecutar un análisis con una API key configurada por el usuario).

---

## 2. Gestión Segura de Credenciales y API Keys
- Las API Keys (Gemini, OpenAI, OpenRouter) se almacenan localmente en la tabla `settings` de IndexedDB del navegador.
- Las peticiones a las APIs de IA se realizan directamente desde el cliente (navegador) hacia los endpoints oficiales de cada proveedor mediante HTTPS.
- El usuario puede borrar sus API keys en cualquier momento desde la pantalla de Configuración con un solo toque.

---

## 3. Prevención de Vulnerabilidades Web (OWASP Top 10)

### 3.1. Cross-Site Scripting (XSS)
- Todo contenido Markdown (en notas, borradores o resúmenes de fuentes) se sanitiza antes de su renderizado utilizando un parser seguro con escape automático de tags HTML ejecutables (`<script>`, `<iframe>`, `<object>`).
- Enlaces externos (DOI, Canva, Google Docs) se configuran con `rel="noopener noreferrer"` y `target="_blank"`.

### 3.2. Sanitización de Exportaciones e Importaciones
- La importación de copias de seguridad en formato JSON valida estrictamente los tipos de cada objeto contra el esquema de TypeScript antes de insertarlos en IndexedDB, rechazando objetos malformados o con propiedades no reconocidas.

---

## 4. Política de Integridad Académica y Anti-Alucinación
- Los sistemas de IA contextuales están explícitamente restringidos mediante prompts de sistema que prohíben inventar referencias o citas.
- Cualquier campo que no provenga de una respuesta de API verificada (OpenAlex/Crossref) o que no haya sido validado manualmente por el usuario se marca como `DATO NO VERIFICADO`.
