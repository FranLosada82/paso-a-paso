# Esquema de contenidos (un fichero JSON por asignatura)

Fichero: `src/content/<asignaturaId>.json`, UTF-8, JSON válido (sin comentarios), sangría de 2 espacios.

```json
{
  "id": "mates",                       // estable: mates|lengua|naturales|sociales|musica|science|ingles
  "nombre": "Matemáticas",
  "libro": "Matemáticas 2.º Primaria (Santillana, Construyendo mundos)",
  "idioma": "es",                      // "en" para Natural Science e Inglés
  "temas": [
    {
      "id": "mates-t01",               // estable: <asignatura>-tNN
      "numero": 1,
      "titulo": "Los números hasta el 99",
      "paginas": "8-21",               // páginas del PDF donde está el tema
      "resumen": "Qué se aprende, 1 frase para el adulto",
      "explicacion": "Explicación corta para el niño (2-4 frases, lenguaje de 7 años)",
      "conceptos": [ ...Concepto ],    // opcional (capa pedagógica, ver abajo)
      "preguntas": [ ...Pregunta ]
    }
  ]
}
```

## Tipos de pregunta (todas llevan `id` estable `<temaId>-pNN`, `tipo`, `pagina` (página del libro donde se trabaja, dentro del rango del tema; la pregunta solo sale cuando la clase ha llegado a esa página), `enunciado`, `explicacion`; opcional `ayuda` = traducción/pista en español para las de inglés)

- `eleccion`: `"opciones": ["a","b","c"]` (2-4), `"correcta": 0` (índice).
- `vf`: `"correcta": true|false`.
- `escribir`: `"respuestas": ["veinte","20"]` (todas las aceptadas), `"exigeAcentos": false` (true solo si la tilde es lo que se evalúa). Se normalizan mayúsculas y espacios.
- `ordenar`: `"elementos": ["primero","segundo","tercero"]` en el ORDEN CORRECTO (la app los desordena). 3-5 elementos, todos distintos.
- `relacionar`: `"pares": [["perro","mamífero"],["águila","ave"]]` 3-4 pares, lados izquierdos distintos y derechos distintos.

Reglas: preguntas originales (no copiar textos del libro), una sola respuesta correcta sin ambigüedad, explicación que enseña el porqué. La explicación se muestra también cuando el niño falla: no la empieces con «¡Bien!» (si lo hace, la app quita esa felicitación al fallar).

## Capa pedagógica (opcional por tema; la app funciona sin ella)

Sin `conceptos`, la app usa el tema entero como un único concepto, estima el nivel por el tipo de pregunta y genera pistas automáticas (quitar una opción, decir la primera letra, colocar el primer elemento, unir una pareja). Con `conceptos`, el tutor enseña idea a idea.

### Concepto

```json
{
  "id": "mates-t01-c01",               // estable: <temaId>-cNN
  "nombre": "Decenas y unidades",      // lo ve el niño: corto
  "pagina": 14,                        // donde empieza en el libro (no se presenta antes)
  "objetivo": "Qué debe lograr el niño (para el adulto)",
  "descubre": "Presentación ANTES de preguntar: 20-50 palabras, una sola idea, vocabulario de 7 años, ejemplo cotidiano (animales, juguetes, colegio, naturaleza).",
  "ayuda": "Opcional: apoyo en español para asignaturas en inglés",
  "otraManera": [                      // «Explícamelo de otra manera»: 2-3, estilos distintos
    { "estilo": "ejemplo", "texto": "Con juguetes, comida, animales…" },
    { "estilo": "pasos", "texto": "1. …\n2. …\n3. …" },
    { "estilo": "visual", "texto": "Con emojis o una fila de números: 📦📦 🍬🍬🍬" },
    { "estilo": "comparar", "texto": "Comparando dos casos parecidos" }
  ]
}
```

### Campos extra de cada pregunta

- `concepto`: id de un concepto del mismo tema. Si el tema tiene conceptos, **todas** sus preguntas deben tener uno.
- `nivel`: `1` inicial (concreta, pocas opciones, ejemplo familiar), `2` intermedio (comprensión y aplicación), `3` avanzado (situación nueva, problema, combinar ideas).
- `pistas`: 1-2 pistas progresivas que ayudan a pensar. **Nunca** contienen la respuesta (el validador lo comprueba).
- `revisar: true`: contenido dudoso (OCR incompleto, sin verificar con el libro). La pregunta no se muestra al niño.

Cada concepto necesita al menos 3 preguntas de al menos 2 tipos, idealmente con niveles 1, 2 y 3. Los ejemplos de `descubre` y `otraManera` no deben resolver ninguna pregunta del concepto (usa otros números u otros casos).

## Validación

```bash
npm run validate:content
```

Comprueba ids únicos, páginas dentro del tema, que la solución se acepta y los distractores no, opciones o parejas repetidas, pistas que dan la respuesta, longitud de `descubre`, al menos 2 explicaciones alternativas y que cada pregunta apunta a un concepto existente. Lo que no puede comprobar una máquina (que el contenido coincide con el libro) se anota en `CONTENIDO_REVISAR.md` o se marca con `revisar`.

## Prompt para generar o ampliar un tema a partir del OCR del libro

Flujo: PDF → OCR local → asignatura y tema → conceptos → objetivos → nivel → actividades → validación → revisión del adulto.

> Eres especialista en Primaria (2.º, 7 años) y en aprendizaje adaptativo. Te paso el texto OCR de las páginas {ini}-{fin} del libro «{libro}», tema {numero} «{titulo}». Devuelve SOLO el objeto JSON del tema con el esquema de `src/content/ESQUEMA.md`.
>
> 1. Separa en el OCR: definiciones, ejemplos, ejercicios del libro y objetivos. Si un fragmento está mal reconocido o incompleto, no generes preguntas sobre él: anótalo aparte como duda.
> 2. Identifica de 3 a 6 conceptos fundamentales en el orden del libro, cada uno con la página donde empieza, su objetivo y una presentación `descubre` de 20-50 palabras.
> 3. Para cada concepto, 3-5 preguntas originales (no copies frases del libro) de al menos 2 tipos, con niveles 1, 2 y 3. Nivel 3 = situación distinta de los ejemplos del libro. Evita las preguntas de memorizar definiciones.
> 4. Una única respuesta correcta en las de elegir; distractores plausibles (errores típicos a esta edad) pero inequívocamente incorrectos. En `escribir`, todas las formas correctas equivalentes.
> 5. Para cada pregunta: 1-2 pistas que ayuden a pensar sin dar la respuesta, y una explicación que enseñe el porqué sin felicitar.
> 6. Para cada concepto: 2-3 explicaciones «de otra manera» (ejemplo con juguetes o comida, paso a paso, visual con emojis, comparación) que no resuelvan ninguna pregunta.
> 7. No presentes como del libro nada que no esté en el OCR. Los ejemplos cotidianos inventados se permiten si no contradicen el contenido escolar. Si no puedes verificar una respuesta con el texto, marca la pregunta con `"revisar": true`.
> 8. Matemáticas: cálculo mental, paso a paso, problemas cotidianos, series. Lengua: comprensión, vocabulario, ortografía, gramática con ejemplos. Ciencias: observar, clasificar, causas y consecuencias, comparar. Inglés: frases cortas del nivel del libro, `ayuda` en español; distingue el error de idioma del error de concepto. Música: conceptos, ritmos y patrones, instrumentos.
