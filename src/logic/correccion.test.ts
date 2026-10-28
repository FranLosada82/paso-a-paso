import { describe, expect, it } from 'vitest';
import { esCorrecta, normalizar } from './correccion';
import type { Pregunta } from '../types';

const base = { id: 'x', enunciado: '', explicacion: '' };

describe('normalizar', () => {
  it('ignora mayúsculas, espacios y puntuación final', () => {
    expect(normalizar('  El   Perro. ', true)).toBe('el perro');
    expect(normalizar('¿Qué?', false)).toBe('qué');
  });
  it('quita tildes pero conserva la ñ', () => {
    expect(normalizar('Camión', true)).toBe('camion');
    expect(normalizar('NIÑO', true)).toBe('niño');
    expect(normalizar('pingüino', true)).toBe('pinguino');
  });
});

describe('esCorrecta', () => {
  const escribir: Pregunta = { ...base, tipo: 'escribir', respuestas: ['cuarenta y cinco', '45'] };
  it('escribir: acepta variantes, mayúsculas y espacios', () => {
    expect(esCorrecta(escribir, { tipo: 'escribir', texto: ' 45 ' })).toBe(true);
    expect(esCorrecta(escribir, { tipo: 'escribir', texto: 'Cuarenta  y cinco' })).toBe(true);
    expect(esCorrecta(escribir, { tipo: 'escribir', texto: '54' })).toBe(false);
    expect(esCorrecta(escribir, { tipo: 'escribir', texto: '' })).toBe(false);
  });
  it('escribir: tildes solo cuentan si se evalúan', () => {
    const libre: Pregunta = { ...base, tipo: 'escribir', respuestas: ['camión'] };
    const tilde: Pregunta = { ...libre, exigeAcentos: true };
    expect(esCorrecta(libre, { tipo: 'escribir', texto: 'camion' })).toBe(true);
    expect(esCorrecta(tilde, { tipo: 'escribir', texto: 'camion' })).toBe(false);
    expect(esCorrecta(tilde, { tipo: 'escribir', texto: 'CAMIÓN' })).toBe(true);
  });
  it('escribir: la ñ no se confunde con n', () => {
    const p: Pregunta = { ...base, tipo: 'escribir', respuestas: ['año'] };
    expect(esCorrecta(p, { tipo: 'escribir', texto: 'ano' })).toBe(false);
  });
  it('eleccion y vf', () => {
    const e: Pregunta = { ...base, tipo: 'eleccion', opciones: ['a', 'b'], correcta: 1 };
    expect(esCorrecta(e, { tipo: 'eleccion', indice: 1 })).toBe(true);
    expect(esCorrecta(e, { tipo: 'eleccion', indice: 0 })).toBe(false);
    const v: Pregunta = { ...base, tipo: 'vf', correcta: false };
    expect(esCorrecta(v, { tipo: 'vf', valor: false })).toBe(true);
    expect(esCorrecta(v, { tipo: 'vf', valor: true })).toBe(false);
  });
  it('ordenar y relacionar', () => {
    const o: Pregunta = { ...base, tipo: 'ordenar', elementos: ['1', '2', '3'] };
    expect(esCorrecta(o, { tipo: 'ordenar', orden: ['1', '2', '3'] })).toBe(true);
    expect(esCorrecta(o, { tipo: 'ordenar', orden: ['2', '1', '3'] })).toBe(false);
    const r: Pregunta = { ...base, tipo: 'relacionar', pares: [['a', 'A'], ['b', 'B'], ['c', 'C']] };
    expect(esCorrecta(r, { tipo: 'relacionar', pares: [['b', 'B'], ['a', 'A'], ['c', 'C']] })).toBe(true);
    expect(esCorrecta(r, { tipo: 'relacionar', pares: [['a', 'B'], ['b', 'A'], ['c', 'C']] })).toBe(false);
    expect(esCorrecta(r, { tipo: 'relacionar', pares: [['a', 'A']] })).toBe(false);
  });
});
