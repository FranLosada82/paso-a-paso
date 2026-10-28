# CHENCHO REPASO — app de repaso de 2.º de Primaria

App web instalable (PWA) estilo Duolingo para niños de 7-8 años. El niño elige asignatura; un adulto indica **por qué página del libro va la clase** y las preguntas salen **solo de lo que ya se ha visto hasta esa página**, aunque el tema esté a medias. Funciona sin conexión después de la primera carga, sin cuentas, sin anuncios ni analítica.

## Contenido

| Asignatura | Temas | Preguntas |
|---|---|---|
| Matemáticas | 9 | 137 |
| Lengua Castellana | 9 | 136 |
| Ciencias de la Naturaleza | 6 | 100 |
| Ciencias Sociales (Madrid) | 6 | 93 |
| Natural Science (inglés con ayuda en español) | 6 | 103 |
| Inglés | 11 | 170 |
| Música (sin audio) | 24 | 290 |
| **Total** | **71** | **1029** |

- Los temas siguen el índice y el orden de los libros de 2.º (OCR local de los PDF aportados por la familia; páginas en `paginas`).
- Las preguntas son **originales**, inspiradas en los contenidos de cada tema; no son copia del libro. No se garantiza que cubran todo lo trabajado en clase. Hay dudas anotadas en `CONTENIDO_REVISAR.md`.
- Tipos: elección, verdadero/falso, escribir, ordenar (tocando) y relacionar (tocando). Sin arrastrar.
- Sesiones de 10 preguntas. Prioriza las falladas y las no vistas. Lo que se falla se repite al final de la sesión. Sin vidas, rachas ni castigos.

## Uso

1. **Zona de adultos** (abajo en la pantalla de inicio; pregunta la raíz cúbica de 27 para evitar toques accidentales).
2. En cada asignatura, **Página** → escribe la página por la que vais (o usa − / +, o «Terminado» en un tema). Se ve qué temas quedan completos, cuál está a medias y cuántas preguntas hay disponibles.
3. El niño entra en la asignatura y pulsa «Repasar todo lo dado» o un tema concreto (completo o a medias).
4. En la Zona de adultos: dominio por asignatura, texto grande, sonido (apagado por defecto), copia de seguridad y reinicio.

## Arranque local (Mac)

Requiere Node 20 o superior (probado con Node 22.23).

```bash
cd app
npm install
npm run dev          # desarrollo: http://localhost:5173
npm run build && npm run preview   # versión final: http://localhost:4173
```

## Instalar en la tableta

La app está publicada en **https://franlosada82.github.io/paso-a-paso/** (GitHub Pages; cada push a `main` la vuelve a publicar con `.github/workflows/pages.yml`). El repositorio es público.


Para instalarla y que funcione offline, la tableta tiene que abrirla **una vez por HTTPS** (o desde `localhost`, que en una tableta no sirve). Opciones, sin publicar nada en Internet salvo que lo decidas:

- **Red de casa con certificado:** servir `dist/` con un servidor HTTPS local (p. ej. `caddy`) y un certificado de confianza instalado en la tableta.
- **Hosting estático** (Netlify, Cloudflare Pages, GitHub Pages): sube la carpeta `dist/`. Es una decisión del adulto: el contenido quedaría accesible para quien tenga la URL; usa un hosting privado o con contraseña si los textos derivan de libros con licencia.

Después de abrirla por HTTPS:
- **Android (Chrome):** menú ⋮ → «Instalar aplicación» / «Añadir a pantalla de inicio».
- **iPad / iPhone (Safari):** botón Compartir → «Añadir a pantalla de inicio». En iPadOS 17+ el botón Compartir está arriba a la derecha.
- Abre la app instalada una vez con conexión, espera unos segundos y prueba con **modo avión**.

## Progreso y copias

- Se guarda en el dispositivo (IndexedDB). El navegador puede borrarlo si se limpian datos; Safari puede hacerlo si no se usa la app en semanas.
- Zona de adultos → «Descargar copia» genera un JSON (versión de esquema, validado al importar, máx. 5 MB). «Restaurar copia» pide confirmación antes de sustituir.
- Cuando hay una versión nueva, aparece un aviso «Actualizar»; el progreso se conserva.

## Añadir o corregir contenido

Un fichero por asignatura en `src/content/<id>.json` (formato en `src/content/ESQUEMA.md`). Los ids (`mates-t03-p07`) son estables: el progreso va ligado a ellos, así que **no reutilices un id para otra pregunta**. Tras editar:

```bash
npm run validate:content
```

Comprueba ids únicos, que la solución de cada pregunta se acepta y que una respuesta errónea no.

## Pruebas (resultado real, 28-10-2026)

```bash
npm run check   # lint + tipos + unitarias + build + e2e
```

- **ESLint y TypeScript:** sin errores.
- **Vitest, 31 pruebas OK:** corrección (mayúsculas, espacios, tildes solo si se evalúan, ñ, ordenar, relacionar), sesiones limitadas a los temas dados, IndexedDB guardar/reabrir, exportar/importar con validación y rechazo de ficheros erróneos, y validación de las 1029 preguntas.
- **Playwright, 2 pruebas OK:**
  - Chromium como tableta Android: primera carga, service worker, adulto marca temas, sesión completa, **modo sin red** (recarga, las 7 asignaturas, practicar), cierre y reapertura con progreso.
  - WebKit como iPad: el mismo flujo **sin la parte offline**, porque Playwright no admite service workers en WebKit.

**Pendiente en dispositivos reales** (no tengo acceso a ellos): instalación en Android e iPad y modo avión real. Pasos: instalar como arriba → abrir con red → cerrar → modo avión → abrir desde el icono → completar una sesión → cerrar y reabrir → comprobar el progreso.

## Solución de problemas

- **No aparece «Instalar»:** no está en HTTPS, o en iOS no se usa Safari.
- **No abre sin red:** abre la app una vez con red y espera unos segundos a que se descargue.
- **El progreso desapareció:** restaura la última copia desde la Zona de adultos.
- **Una pregunta está mal:** corrígela en el JSON y ejecuta `npm run validate:content`.

## Privacidad y materiales

- No se recogen datos del niño ni hay conexiones externas al estudiar.
- Los PDF y el texto OCR (`../libros_2primaria_v2`, `../_texto_libros`) están **fuera** de la app y no se incluyen en `dist/`. No los subas a ningún hosting.
- Para generar las preguntas, el texto OCR de los libros se envió a Anthropic (Claude) con la autorización expresa del adulto.
