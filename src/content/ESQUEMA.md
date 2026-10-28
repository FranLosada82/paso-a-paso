# Esquema de contenidos (un fichero JSON por asignatura)

Fichero: `src/content/<asignaturaId>.json`, UTF-8, JSON válido (sin comentarios).

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
      "preguntas": [ ...Pregunta ]
    }
  ]
}
```

## Tipos de pregunta (todas llevan `id` estable `<temaId>-pNN`, `tipo`, `enunciado`, `explicacion`; opcional `ayuda` = traducción/pista en español para las de inglés)

- `eleccion`: `"opciones": ["a","b","c"]` (2-4), `"correcta": 0` (índice).
- `vf`: `"correcta": true|false`.
- `escribir`: `"respuestas": ["veinte","20"]` (todas las aceptadas), `"exigeAcentos": false` (true solo si la tilde es lo que se evalúa). Se normalizan mayúsculas y espacios.
- `ordenar`: `"elementos": ["primero","segundo","tercero"]` en el ORDEN CORRECTO (la app los desordena). 3-5 elementos, todos distintos.
- `relacionar`: `"pares": [["perro","mamífero"],["águila","ave"]]` 3-4 pares, lados izquierdos distintos y derechos distintos.

Reglas: preguntas originales (no copiar textos del libro), una sola respuesta correcta sin ambigüedad, explicación alentadora que enseña el porqué.
