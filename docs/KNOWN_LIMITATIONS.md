# KNOWN LIMITATIONS & MITIGATIONS: Alfajorcito OS

## 1. Limitaciones Técnicas Identificadas

### 1.1. Sincronización Automática entre Dispositivos Múltiples
- **Estado Actual**: En arquitectura Local-First pura sin servidor central, los datos residen en el navegador/dispositivo específico.
- **Mitigación**:
  - Función de copia de seguridad integral con 1-clic (`Backup JSON / Export ZIP`) que puede guardarse en Google Drive o sincronizarse entre dispositivos.
  - Exportación estructurada a Obsidian Vault que permite sincronizar con Obsidian Sync o iCloud Drive.

### 1.2. Google Scholar Sin API Oficial Abierta
- **Estado Actual**: Google Scholar no provee una API pública gratuita y bloquea peticiones automatizadas.
- **Mitigación**:
  - Integración nativa con OpenAlex (250M+ artículos científicos), Crossref y Semantic Scholar que proveen cobertura equivalente o superior con metadatos estructurados oficiales y resolución de DOI.

### 1.3. Conexión Directa a Obsidian Local REST API en iOS Safari PWA
- **Estado Actual**: Las PWAs en iOS tienen restricciones de red para acceder a `127.0.0.1` si no está en HTTPS con certificado confiable.
- **Mitigación**:
  - El exportador de Vault a archivo `.zip` funciona de forma 100% nativa en iOS (permitiendo descomprimir la carpeta directamente en la carpeta de Obsidian en la app Archivos de iOS / iPadOS).
