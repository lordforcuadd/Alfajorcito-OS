# FIX LIST — Auditoría Alfajorcito OS (2026-08-25)
**Base:** commit `e8e50f4`, working tree limpio. Verificación previa: `tsc --noEmit` ✅ · vitest 46/46 ✅ · build PWA ✅
**Instrucción para el agente:** corregir cada ítem en orden de prioridad. NO refactorizar más allá del fix indicado. Cada fix debe mantener los 46 tests existentes en verde y añadir el test de aceptación indicado. Al terminar, ejecutar la sección "Verificación final".

---

## 🔴 PRIORIDAD CRÍTICA — Cadena anti-alucinación (corrompe datos académicos)

### F-01. `resolveDOI` devuelve fuente INCORRECTA como si fuera resuelta
- **Archivo:** `src/services/academicApis.ts` — líneas ~201–209 (Estrategia 4).
- **Problema:** si el input tiene un DOI válido pero las 3 estrategias fallan, hace fallback a `searchOpenAlex(trimmed)` buscando el DOI crudo como texto libre. Devuelve el primer resultado que **no corresponde necesariamente a ese DOI**, y la UI lo importa como el artículo correcto.
- **Fix requerido:** eliminar el fallback a búsqueda libre cuando `validDoi` existe. La Estrategia 4 solo debe ejecutarse si NO se detectó un DOI (`validDoi === null`). Si hay DOI y las 3 estrategias fallan → devolver `null`.
- **Test de aceptación:** nuevo test que simule fallo de las 3 estrategias con input `"10.0000/no-existe"` y afirme que `resolveDOI` retorna `null` (no un resultado cualquiera).

### F-02. Año inventado con `new Date().getFullYear()` al parsear metadatos
- **Archivo:** `src/services/academicApis.ts` — `parseOpenAlexWork` (~línea 79), Crossref (~146 y ~363), DOI.org (~184), Semantic Scholar (~267), DOAJ (~318).
- **Problema:** cuando la API no trae año, se fabrica el año actual. La fuente entra a la biblioteca pasando falsamente el validador de antigüedad.
- **Fix requerido:** cuando no hay año, usar `0` (que `sourceAgeValidator.ts` ya interpreta como `NEEDS_JUSTIFICATION`) o `undefined`. NUNCA default al año actual. Ajustar `Source.year` a opcional si es necesario (`year?: number`) y revisar los usos de `source.year || 's.f.'`.
- **Test de aceptación:** parsear un item sin `publication_year` y afirmar que el resultado NO tiene `year === new Date().getFullYear()`.

### F-03. Apellidos compuestos españoles/partidos corruptos en los 3 parsers
- **Archivo:** `src/services/academicApis.ts` — `parseOpenAlexWork` (~58–60), Semantic Scholar (~258–259), DOAJ (~301–303).
- **Problema:** split por espacio: «Delgado Chacón, María» → lastName=`Chacón`, firstName=`María Delgado`. Todas las citas generadas quedan mal con apellidos compuestos peruanos.
- **Fix requerido:** extraer la lógica a una función compartida `parseDisplayName(rawName): Author` con heurística robusta:
  - Si contiene coma: `lastName = parte antes de la coma`, `firstName = después`.
  - Sin coma: tratar partículas (`de`, `del`, `la`, `los`, `von`, `van`, `da`) y la última palabra como apellido; si hay ≥3 palabras, considerar las dos últimas como apellido compuesto SOLO si la penúltima no es partícula… mínimo aceptable: respetar comas y partículas; documentar limitación.
  - Exportarla desde `academicApis.ts` (o `utils/`) y usarla en los 3 parsers.
- **Test de aceptación:** casos «María Delgado Chacón» → `{firstName: 'María', lastName: 'Delgado Chacón'}`; «Gargurevich Regal, Alejandra» → lastName=`Gargurevich Regal`; nombre simple «Plato» → lastName=`Plato`.

---

## 🟠 ALTA — Corrección de citas y exportadores

### F-04. Enlace roto en Obsidian export sin DOI
- **Archivo:** `src/utils/obsidianExporter.ts` — línea ~74 (`generateSourceMarkdown`).
- **Problema:** produce `` [Sin DOI](https://doi.org/) `` cuando `source.doi` está vacío.
- **Fix requerido:** renderizado condicional: con DOI → link; sin DOI → texto plano `- **DOI**: Sin DOI registrado`.

### F-05. `generateBibTeX` produce entradas inválidas
- **Archivo:** `src/utils/citationEngine.ts` — líneas 397–413.
- **Problemas:** (a) todo lo no-BOOK se exporta como `@article` (WEBPAGE/THESIS/REPORT incorrectos); (b) citeKey usa apellido crudo (espacios/tildes/ñ rompen LaTeX); (c) BOOK exporta campos `journal`/`number` vacíos.
- **Fix requerido:**
  - Mapa de tipos: `JOURNAL_ARTICLE→@article`, `BOOK→@book`, `BOOK_CHAPTER→@incollection`, `CONFERENCE_PAPER→@inproceedings`, `THESIS→@phdthesis`, `REPORT→@techreport`, `WEBPAGE/OTHER→@misc`.
  - citeKey: sanitizar con la misma lógica de `sanitizeSlug` (quitar tildes, espacios→nada) → `delgadochacon2024`.
  - Campos condicionales: solo incluir campos no vacíos; `journal` solo en `@article`; añadir `howpublished` para `@misc` con URL.
- **Test de aceptación:** BibTeX de THESIS contiene `@phdthesis`; citeKey sin espacios ni tildes; entrada BOOK sin campo `journal`.

### F-06. `.replace(/\.\./g, '.')` corrompe títulos legítimos
- **Archivo:** `src/utils/citationEngine.ts` — líneas 140, 145, 149, 169, 203, 218, 279, 284, 289, 309, 343, 358, 371, 374.
- **Problema:** elimina cualquier `..` real dentro de títulos/autores (rutas, siglas, elipsis).
- **Fix requerido:** reemplazar por normalización de puntuación colgante: usar `.replace(/\.\s*\./g, '.')` NO es suficiente; mejor construir las partes con un helper `joinReference(parts: string[])` que filtre vacíos y evite dobles puntos generados por concatenación de segmentos vacíos, en vez de un replace ciego post-hoc. Mínimo aceptable: aplicar el replace solo sobre separadores generados (p. ej. `'..'.replace` cuando title termina en punto + `. ${pub}`), construyendo con template seguro.
- **Test de aceptación:** título con `A..B Test` (literal) se preserva en la referencia APA 7.

### F-07. Contador `tokensUsedThisMonth` nunca se reinicia
- **Archivo:** `src/services/aiService.ts` — `trackTokensUsed` (~426–444); tipo en `src/types/index.ts` (`tokensUsedThisMonth?: number`).
- **Problema:** solo incrementa; crece infinito.
- **Fix requerido:** guardar también `tokensMonthKey` (formato `YYYY-MM`). En cada incremento: si el mes actual ≠ guardado, resetear a 0 antes de sumar.
- **Test de aceptación:** test unitario de la función pura extraída `resolveTokenCount(previous: {monthKey, count}, now): {monthKey, count}` cubriendo cambio de mes.

### F-08. Números de referencia IEEE/Vancouver incorrectos e inestables
- **Archivo:** `src/modules/research/ResearchView.tsx` — `sourceRefNum` (~104–114).
- **Problema:** el número sale del índice en `db.sources.toArray()` (orden por PK), no del orden real de referencias del trabajo.
- **Fix requerido:** numerar por orden alfabético de referencia APA dentro del trabajo vinculado (convención IEEE/Vancouver = orden de aparición; dado que no hay orden de aparición en el modelo actual, usar orden alfabético de `formatFullReference(source,'APA_7')` entre las fuentes del mismo workId, documentándolo). Extraer a función pura testable `computeReferenceNumber(sources: Source[], workId: string, sourceId: string): number`.
- **Test de aceptación:** 3 fuentes del mismo work → números 1,2,3 estables por orden alfabético; fuente sin work → fallback definido y testeado.

---

## 🟡 MEDIA — Robustez runtime

### F-09. Lista de modelos Gemini con nombres inexistentes
- **Archivo:** `src/services/aiService.ts` — `preferredOrder` (~518–545) y default (~538–545).
- **Problema:** `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3-flash-preview` no existen. Si falla discovery, se prueban hasta 4 modelos inválidos × timeout 12 s.
- **Fix requerido:** purgar la lista dejando solo modelos reales actuales: `['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-1.5-flash']`. Default sin discovery: `gemini-flash-latest`. Reducir timeout por candidato a 8 s.

### F-10. Portapapeles sin fallback (falla en HTTP local / Laragon)
- **Archivos:** `src/modules/research/ResearchView.tsx` (~648, ~682, ~712), `src/modules/works/WorkWorkspace.tsx` (~180, ~769).
- **Problema:** `navigator.clipboard.writeText(...)` pelado lanza en contexto no-secure. Existe `copyRichReference` con fallback pero no se usa.
- **Fix requerido:** crear helper único `copyText(text: string): Promise<boolean>` en `citationEngine.ts` (o utils) con: clipboard API → try/catch → fallback `document.execCommand('copy')` via textarea temporal → devolver booleano. Reemplazar TODAS las llamadas directas; mostrar toast de error si retorna false.
- **Test de aceptación:** test del fallback con `navigator.clipboard === undefined` (mock).

### F-11. Handler duplicado de ~55 líneas en ResearchView
- **Archivo:** `src/modules/research/ResearchView.tsx` — botones (~998–1046 y ~1053–1112).
- **Problema:** dos handlers casi idénticos que divergen (uno sin catch muestra nada en error).
- **Fix requerido:** extraer `saveQuoteAndParaphrase({ auditWithAi: boolean })`; ambos botones lo llaman. Unificar manejo de errores (try/catch/finally con toast en catch para ambos).

### F-12. Re-seed forzado no limpia datos previos
- **Archivo:** `src/db/seed.ts` — `initializeDatabaseSeed(force=true)` (~1310–1364).
- **Problema:** `bulkPut` fusiona semilla nueva con datos viejos.
- **Fix requerido:** en rama `force=true`, limpiar primero las 10 tablas de entidades (NO settings) dentro de la misma transacción antes del bulkPut.

### F-13. `clearAllDatabaseData` borra settings sin restaurar defaults
- **Archivo:** `src/db/index.ts` — líneas 59–89.
- **Problema:** deja solo `has_initialized`; perfil/config IA desaparecen y lecturas caen a defaults hardcodeados inconsistentes (Dashboard hardcodea USMP/Saory en `DashboardView.tsx:94–101`).
- **Fix requerido:** restaurar tras el clear los mismos 3 defaults de seed (`user_profile`, `ai_settings`, `obsidian_settings` desde `DEFAULT_USER_PROFILE` etc.). Además: centralizar el objeto de fallback del perfil en un solo lugar exportado (types o utils) y usarlo tanto en DashboardView como aiService para que no diverjan.

### F-14. ICS con hora UTC desplazada
- **Archivo:** `src/utils/googleExporter.ts` — `generateICSFile` (96–121) y `generateGoogleCalendarUrl` (83–94).
- **Problema:** deadlines a medianoche local UTC-5 aterrizan un día antes en apps de calendario.
- **Fix requerido:** emitir el evento en hora local flotante: formatear componentes locales del Date (`YYYYMMDDTHHMMSS` sin sufijo Z, según RFC 5545 floating time) en vez de `toISOString()` (UTC). Aplicar lo mismo a las fechas del Google Calendar URL.
- **Test de aceptación:** deadline `new Date(y, m, d, 0, 0)` → DTSTART empieza con `YYYYMMDDT000000`.

### F-15. Esquema Dexie v2 muerto (idéntico a v1)
- **Archivo:** `src/db/index.ts` — líneas 47–52.
- **Fix requerido:** eliminar `version(2)` (Dexie permite borrar versiones no liberadas; si ya fue liberada a usuarios reales, dejarla y documentar por qué — verificar primero si existen instalaciones activas con v2 aplicada; si sí, conservar con comentario).

---

## ⚪ BAJA — Calidad / convenciones

### F-16. Convención "cero `any`" incumplida
- **Archivos:** `src/services/academicApis.ts` (~297 DOAJ `item: any`, ~353 Crossref `item: any`), `src/modules/research/ResearchView.tsx` (~296 `eng.id as any`).
- **Fix requerido:** definir interfaces mínimas `DoajApiResult` y `CrossrefApiItem` tipadas; tipar el array de motores de búsqueda de ResearchView con union literal en vez de cast.

### F-17. Semilla con docentes reales-nominados + emails inventados
- **Archivo:** `src/db/seed.ts` (courses, ~líneas 26–400).
- **Fix requerido:** decidir política: (a) renombrar docentes demo a nombres claramente ficticios («Dra. Demo Pérez») con email `demo@ejemplo.local`, O (b) dejarlos pero marcar los cursos demo con flag y que los formularios de inquiry NO pre-pueblen emails de cursos sembrados. Implementar (a) — es lo simple y honesto con la regla de veracidad del proyecto.

### F-18. Dashboard "hoy" omite tareas vencidas hoy
- **Archivo:** `src/modules/dashboard/DashboardView.tsx` — línea ~65.
- **Problema:** exige `dueDate >= now`; tarea vencida hoy 09:00 vista a las 14:00 desaparece de "¿Qué debo hacer hoy?".
- **Fix requerido:** cambiar condición a inicio-del-día: `dueDate >= startOfToday && dueDate <= endOfToday` (usar `new Date().setHours(0,0,0,0)` y `+86399999`). Mantener deduplicación con overdueTasks (ya testeada en `smokeAndIntegration.test.ts` — actualizar ese test si cambia la frontera).

### F-19. Detección de escritura evalúa viewport una sola vez
- **Archivo:** `src/components/layout/AppShell.tsx` (~170 y ~199).
- **Fix requerido:** sustituir check estático `window.innerWidth < 768` por media query reactiva (`window.matchMedia('(max-width: 767px)')` + listener `change`) o mover el gate dentro del handler evaluando en cada evento.

### F-20. Cobertura de tests de las zonas corregidas
- **Fix requerido:** además de los tests por-fix anteriores, añadir suite `src/tests/metadataIngestion.test.ts` cubriendo: `parseDisplayName` (F-03), año faltante (F-02), estrategia DOI (F-01), `computeReferenceNumber` (F-08), `copyText` fallback (F-10).

---

## Verificación final (obligatoria antes de cerrar)

```bash
cd "/c/laragon/www/Alfajorcito OS"
npx tsc --noEmit          # 0 errores
npx vitest run            # todos los tests existentes + nuevos en verde
npm run build             # build PWA exitoso
grep -rn ": any\|as any" src --include="*.ts*"   # debe retornar vacío
```

## Orden de trabajo sugerido
1. F-01 → F-02 → F-03 (críticos, mismo archivo, un commit por fix)
2. F-04 → F-08 (alta, commits separados citación/exportadores)
3. F-09 → F-15 (media)
4. F-16 → F-20 (baja + suite de tests)
