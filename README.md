# CHENCHO REPASO — tutor de 2.º de Primaria

App web instalable (PWA) para niños de 7-8 años. No es un cuestionario: **enseña antes de preguntar**, detecta lo que cuesta, explica los errores de otra manera, adapta la dificultad y vuelve a sacar cada idea con repasos espaciados. Un adulto indica **por qué página del libro va la clase** y todo sale **solo de lo que ya se ha visto hasta esa página**, aunque el tema esté a medias. Funciona sin conexión después de la primera carga, sin cuentas, sin anuncios ni analítica, y sin IA ni servicios externos mientras el niño estudia.

## Cómo enseña (v2)

- **Dos modos.** «Aprender»: presenta una idea y ayuda. «Repasar todo lo dado»: mezcla lo dado sin pistas al principio, útil antes de un control.
- **Sesión de Aprender en cinco fases:** ¿te acuerdas? (repaso espaciado de algo anterior) → descubre (explicación de 20-50 palabras con 🔊) → practicamos con ayuda → piensa y aplica → reto final. Una idea cada vez. Los tipos de actividad se alternan (nunca más de dos iguales seguidas).
- **Errores:** primer fallo → ánimo, una pista y otro intento (en elegir, se tacha la opción fallada). Segundo fallo → «Explícamelo de otra manera», la solución y el porqué, y más adelante una actividad **parecida pero no idéntica**. Dos errores seguidos en una idea → explicación alternativa antes de seguir.
- **Dificultad adaptativa por idea (concepto)** en tres niveles: el nivel 1 muestra dos opciones y ejemplos concretos; el 3, problemas y situaciones nuevas. Sube con tres aciertos limpios en al menos dos tipos de actividad; baja tras dos errores seguidos. Cuentan los intentos y las pistas, **nunca la velocidad**. Umbrales en `src/logic/tutor/parametros.ts`.
- **Repetición espaciada:** cada idea vuelve a los 1, 3, 7, 14 y 30 días; un fallo la acerca otra vez.
- **Gamificación sobria:** estrellas por completar la misión, superar el reto y aprender de un error (no por porcentaje). Sin vidas, rachas, cronómetros ni castigos. El niño no ve estadísticas negativas.
- **Para el adulto:** «Progreso» por asignatura (qué domina, qué le cuesta, qué toca repasar, nivel, pistas, últimas sesiones), duración de la sesión (10, 12 o 15 minutos orientativos) y botones de voz.

Código: el motor pedagógico está separado de la interfaz en `src/logic/tutor/` (`modelo` = capa pedagógica sobre el contenido, `dominio` = nivel y repasos, `planificador` = sesiones, `validar`, `mensajes`, `parametros`). La interfaz está en `src/ui/`.

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
- **Capa pedagógica:** los temas con `conceptos` (ideas con presentación, explicaciones alternativas, nivel y pistas por pregunta) ya enseñan idea a idea. Por ahora es un piloto en el primer tema de cada asignatura (`Total` en `npm run validate:content` lista cuáles). El resto funciona con valores automáticos: el tema entero como una idea, nivel estimado por el tipo de pregunta y pistas generadas a partir de la propia pregunta.

## Uso

1. **Zona de adultos** (abajo en la pantalla de inicio; pregunta la raíz cúbica de 27 para evitar toques accidentales).
2. En cada asignatura, **Página** → escribe la página por la que vais (o usa − / +, o «Terminado» en un tema). Se ve qué temas quedan completos, cuál está a medias y cuántas preguntas hay disponibles.
3. El niño entra en la asignatura y pulsa «Aprender» (o un tema del camino) o «Repasar todo lo dado».
4. En la Zona de adultos: progreso por asignatura, texto grande, sonido (apagado por defecto), voz, duración de la sesión, copia de seguridad y reinicio.

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

## Pruebas (resultado real, 05-11-2026, rama v2)

```bash
npm run check   # lint + tipos + unitarias + build + e2e
```

- **ESLint, TypeScript y build:** sin errores.
- **Vitest, 70 pruebas OK:**
  - Motor de dificultad: sube con aciertos limpios en tipos distintos, no por un solo formato, y no cuenta pistas ni reintentos; baja y pide otra explicación tras dos errores.
  - Repetición espaciada: 1, 3, 7 y 14 días; un fallo acerca el repaso; «dominado» solo tras varios días.
  - Sesiones: cinco fases, una idea cada vez, nivel 1 con dos opciones, reto de nivel alto, solo lo dado en clase, «Repasar» intercalado y priorizando lo que toca, nunca tres actividades seguidas del mismo tipo.
  - Refuerzo: una actividad parecida pero no idéntica. Mensajes: se quita «¡Bien!» de la explicación cuando el niño falla.
  - Simulación de 12 días con el contenido real de Matemáticas.
  - Migración del progreso de la v2 a la v3, con estimación inicial por concepto.
  - Copias de seguridad.
  - Validación de las 1048 preguntas y de los conceptos: pistas sin la respuesta, distractores no aceptados, opciones repetidas, páginas.
- **Prueba manual en el navegador (Chrome, tableta y móvil):** «Aprender» completo, pistas, reintento, «Explícamelo de otra manera», refuerzo, final de misión, «Repasar» sin pistas y la vista «Progreso» del adulto. Sin errores en la consola.
- **Playwright, 2 pruebas OK (repetidas 4 veces sin fallos):**
  - Chromium como tableta Android: primera carga, service worker, el adulto marca la página, sesión de «Aprender» (Descubre, «Explícamelo de otra manera», pista, reto final), sesión de «Repasar» sin pistas al principio, **modo sin red** (recarga, las 7 asignaturas, practicar), cierre y reapertura con progreso, y la vista «Progreso» del adulto.
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
