# DESIGN SYSTEM SPECIFICATION: Alfajorcito OS

## 1. Filosofía de Diseño: Pastel Académico Premium
Alfajorcito OS combina la calidez y serenidad de una paleta pastel (rosa empolvado, lavanda, crema y neutros cálidos) con la precisión tipográfica, sobriedad y funcionalidad de un entorno de investigación de alto rendimiento.

### Principios Fundamentales:
1. **Calidez sin Infantilismo**: Tonos desaturados y elegantes, con suficiente contraste WCAG AA para máxima legibilidad.
2. **Mobile & Touch First**: Todos los elementos interactivos tienen un área de contacto mínima de $44 \times 44$ píxeles.
3. **Claridad de Estados**: Estados explícitos de Verificación (`VERIFIED`, `PARTIALLY_VERIFIED`, `UNVERIFIED`) con códigos de color visualmente inequívocos.
4. **Espaciado y Jerarquía Tipográfica**: Tipografías sans-serif modernas con tracking equilibrado y alturas de línea confortables para lectura prolongada.

---

## 2. Paleta de Color (Design Tokens)

### Colores Base y Neutros
- `--bg-canvas`: `#FAF8F5` (Crema cálido principal para fondo de pantalla)
- `--bg-surface`: `#FFFFFF` (Blanco puro para tarjetas y hojas de trabajo elevadas)
- `--bg-surface-subtle`: `#F5F1EB` (Fondo de contenedores secundarios y paneles laterales)
- `--text-primary`: `#2B2D42` (Pizarra profunda, alto contraste 12.8:1 sobre blanco)
- `--text-secondary`: `#5A6275` (Gris cálido neutro para metadatos, contraste 5.5:1)
- `--text-muted`: `#8D99AE` (Gris suave para placeholders y etiquetas inactivas)
- `--border-subtle`: `#EBE5DF` (Líneas divisorias sutiles)
- `--border-focus`: `#D98880` (Borde activo con tono rosa empolvado)

### Acentos Pastel Académicos
- `--pastel-rose`: `#E8A598` / `--pastel-rose-soft`: `#FDF2F0` (Rosa empolvado principal para Trabajos y Botones primarios)
- `--pastel-lavender`: `#B39DDB` / `--pastel-lavender-soft`: `#F3E5F5` (Lavanda para Cursos e Integraciones de Segundo Cerebro)
- `--pastel-mint`: `#80CBC4` / `--pastel-mint-soft`: `#E0F2F1` (Menta para Conceptos y Estado Cumple/Verificado)
- `--pastel-amber`: `#FFCC80` / `--pastel-amber-soft`: `#FFF8E1` (Ámbar cálido para Notas, Pendientes y Advertencias)
- `--pastel-coral`: `#EF9A9A` / `--pastel-coral-soft`: `#FFEBEE` (Coral suave para Alertas críticas y No cumple)
- `--pastel-blue`: `#90CAF9` / `--pastel-blue-soft`: `#E3F2FD` (Azul cielo para Fuentes y Consultas a Docentes)

### Estados de Cumplimiento y Verificación
- 🟢 `VERIFIED` / `CUMPLE`: `#2E7D32` sobre `#E8F5E9` (Borde `#A5D6A7`)
- 🟡 `PARTIALLY_VERIFIED` / `REVISAR`: `#E65100` sobre `#FFF3E0` (Borde `#FFE0B2`)
- 🔴 `UNVERIFIED` / `NO CUMPLE`: `#C62828` sobre `#FFEBEE` (Borde `#EF9A9A`)

---

## 3. Tipografía
- **Fuente Primaria (Sans-Serif)**: `Plus Jakarta Sans`, `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Fuente Monospaced (Citas, DOI, Código)**: `JetBrains Mono`, `Fira Code`, `monospace`
- **Escala Modular**:
  - `Display / H1`: `24px` / `1.3` (Móvil), `30px` / `1.25` (Tablet)
  - `H2`: `20px` / `1.35`
  - `H3 / Section Title`: `16px` / `1.4` (Semibold)
  - `Body Regular`: `14px` / `1.5`
  - `Body Small / Metadata`: `12px` / `1.45`
  - `Caption / Badge`: `11px` / `1.3` (Medium/Semibold)

---

## 4. Componentes UI Reutilizables

### `Button`
- Variantes: `primary` (Rosa empolvado con texto blanco/oscuro de alto contraste), `secondary` (Borde sutil sobre blanco), `ghost` (Sin borde, fondo sutil al hover/active), `danger` (Coral suave).
- Tamaño móvil: Min height $44\text{px}$, padding $12\text{px } 18\text{px}$.

### `Card`
- Tarjetas limpias, bordes redondeados (`rounded-2xl` / $16\text{px}$), sombra suave (`0 2px 8px rgba(43, 45, 66, 0.04)`), borde sutil de $1\text{px}$ (`#EBE5DF`).

### `Badge`
- Insignias redondeadas tipo píldora (`rounded-full`, padding $4\text{px } 10\text{px}$, texto en $11\text{px}$ con peso `600`).
- Usado para: Estilos de citación (`APA 7`), Estado de Verificación (`VERIFIED`), Antigüedad (`2023 🟢`).

### `SplitView` (Tablet / Desktop)
- Disposición de doble panel sincronizado:
  - Panel Izquierdo ($45\% - 50\%$ de ancho): Lectura de fuente o instrucciones del profesor.
  - Panel Derecho ($50\% - 55\%$ de ancho): Editor de notas, paráfrasis o checklist de verificación.

### `BottomNavigation` (Móvil)
- Barra flotante inferior fija con 5 destinos clave:
  1. `Dashboard` (Inicio / 8 Preguntas)
  2. `Trabajos` (Workspaces académicos)
  3. `+` (Captura Rápida Flotante Central)
  4. `Fuentes` (Biblioteca de investigación)
  5. `Cerebro` (Notas y Grafo)

### `CommandPalette` (Búsqueda Global Ctrl+K)
- Modal superpuesto con entrada de texto enfocada automáticamente, filtros por píldoras y navegación por teclado o toques rápidos.
