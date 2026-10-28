import { describe, expect, it } from 'vitest';
import { crearSesion } from './sesion';
import type { Asignatura, Pregunta } from '../types';

const p = (id: string, pagina = 10): Pregunta => ({ id, tipo: 'vf', enunciado: id, explicacion: '', correcta: true, pagina });
const asig: Asignatura = {
  id: 'x', nombre: 'X', libro: '', idioma: 'es',
  temas: [
    { id: 't1', numero: 1, titulo: '', paginas: '10-19', explicacion: '', preguntas: Array.from({ length: 8 }, (_, i) => p(`t1-${i}`)) },
    { id: 't2', numero: 2, titulo: '', paginas: '20-29', explicacion: '', preguntas: Array.from({ length: 8 }, (_, i) => p(`t2-${i}`, 20 + i)) },
  ],
};

describe('crearSesion', () => {
  it('solo usa los temas indicados (los dados en clase)', () => {
    const s = crearSesion(asig, ['t2'], 99, {});
    expect(s.length).toBe(8);
    expect(s.every((i) => i.temaId === 't2')).toBe(true);
  });
  it('limita a 10 preguntas sin repetir', () => {
    const s = crearSesion(asig, ['t1', 't2'], 99, {});
    expect(s.length).toBe(10);
    expect(new Set(s.map((i) => i.pregunta.id)).size).toBe(10);
  });
  it('prioriza las falladas', () => {
    const hist = { 't1-3': { aciertos: 0, fallos: 1, ultimaCorrecta: false, ultima: 1 } };
    for (let k = 0; k < 20; k++) expect(crearSesion(asig, ['t1', 't2'], 99, hist).some((i) => i.pregunta.id === 't1-3')).toBe(true);
  });
  it('tema a medias: solo hasta la página de clase', () => {
    const s = crearSesion(asig, ['t1', 't2'], 23, {}, 50);
    expect(s.length).toBe(12);
    expect(s.every((i) => (i.pregunta.pagina ?? 0) <= 23)).toBe(true);
  });
  it('sin temas no hay preguntas', () => expect(crearSesion(asig, [], 99, {})).toEqual([]));
});
