import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Asignatura, Pregunta, Respuesta } from '../types';
import { esCorrecta } from '../logic/correccion';
import { META } from './asignaturas';

const dir = join(__dirname);
const asignaturas: Asignatura[] = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

function respuestaCorrecta(p: Pregunta): Respuesta {
  switch (p.tipo) {
    case 'eleccion': return { tipo: 'eleccion', indice: p.correcta };
    case 'vf': return { tipo: 'vf', valor: p.correcta };
    case 'escribir': return { tipo: 'escribir', texto: p.respuestas[0] };
    case 'ordenar': return { tipo: 'ordenar', orden: [...p.elementos] };
    case 'relacionar': return { tipo: 'relacionar', pares: p.pares.map(([a, b]) => [a, b] as [string, string]) };
  }
}
function respuestaIncorrecta(p: Pregunta): Respuesta {
  switch (p.tipo) {
    case 'eleccion': return { tipo: 'eleccion', indice: (p.correcta + 1) % p.opciones.length };
    case 'vf': return { tipo: 'vf', valor: !p.correcta };
    case 'escribir': return { tipo: 'escribir', texto: 'zzz respuesta mala' };
    case 'ordenar': return { tipo: 'ordenar', orden: [...p.elementos].reverse() };
    case 'relacionar': return { tipo: 'relacionar', pares: p.pares.map(([a], i) => [a, p.pares[(i + 1) % p.pares.length][1]] as [string, string]) };
  }
}

describe('contenidos', () => {
  it('están las 7 asignaturas', () => {
    expect(asignaturas.map((a) => a.id).sort()).toEqual(META.map((m) => m.id).sort());
  });
  const ids = new Set<string>();
  for (const a of asignaturas) {
    describe(a.nombre, () => {
      it('estructura y ids estables', () => {
        expect(a.temas.length).toBeGreaterThanOrEqual(3);
        for (const t of a.temas) {
          expect(t.id.startsWith(`${a.id}-t`)).toBe(true);
          expect(t.titulo.trim()).not.toBe('');
          expect(t.explicacion.trim()).not.toBe('');
          expect(t.preguntas.length).toBeGreaterThanOrEqual(10);
          expect(new Set(t.preguntas.map((p) => p.tipo)).size).toBeGreaterThanOrEqual(3);
          for (const p of [t, ...t.preguntas]) { expect(ids.has(p.id), p.id).toBe(false); ids.add(p.id); }
        }
      });
      it('cada pregunta es válida, su solución se acepta y una respuesta errónea no', () => {
        for (const t of a.temas) for (const p of t.preguntas) {
          expect(p.id.startsWith(`${t.id}-p`), p.id).toBe(true);
          expect(p.enunciado.trim(), p.id).not.toBe('');
          expect(p.explicacion.trim(), p.id).not.toBe('');
          if (p.tipo === 'eleccion') {
            expect(p.opciones.length, p.id).toBeGreaterThanOrEqual(2);
            expect(new Set(p.opciones).size, `${p.id} opciones repetidas`).toBe(p.opciones.length);
            expect(p.correcta, p.id).toBeLessThan(p.opciones.length);
          }
          if (p.tipo === 'escribir') expect(p.respuestas.length, p.id).toBeGreaterThan(0);
          if (p.tipo === 'ordenar') expect(new Set(p.elementos).size, p.id).toBe(p.elementos.length);
          if (p.tipo === 'relacionar') {
            expect(new Set(p.pares.map((x) => x[0])).size, p.id).toBe(p.pares.length);
            expect(new Set(p.pares.map((x) => x[1])).size, p.id).toBe(p.pares.length);
          }
          expect(esCorrecta(p, respuestaCorrecta(p)), p.id).toBe(true);
          expect(esCorrecta(p, respuestaIncorrecta(p)), p.id).toBe(false);
        }
      });
    });
  }
  it('total de preguntas', () => {
    const n = asignaturas.reduce((k, a) => k + a.temas.reduce((j, t) => j + t.preguntas.length, 0), 0);
    console.log(`Total: ${n} preguntas en ${asignaturas.reduce((k, a) => k + a.temas.length, 0)} temas`);
    expect(n).toBeGreaterThanOrEqual(180);
  });
});
