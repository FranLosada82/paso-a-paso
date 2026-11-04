import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { estadoInicial, exportarCopia, importarCopia, migrarYValidar, registrarActividad, registrarRespuesta, VERSION_ESQUEMA } from './estado';
import { cargarEstado, guardarEstado } from './db';
import { sembrarConceptos } from '../logic/tutor/resumen';
import { ASIGNATURAS } from '../content/asignaturas';

describe('progreso', () => {
  it('registra aciertos y fallos', () => {
    let e = registrarRespuesta(estadoInicial(), 'p1', false, 1);
    e = registrarRespuesta(e, 'p1', true, 2);
    expect(e.preguntas.p1).toEqual({ aciertos: 1, fallos: 1, ultimaCorrecta: true, ultima: 2 });
  });
  it('sobrevive a guardar y volver a abrir (IndexedDB)', async () => {
    const e = { ...registrarRespuesta(estadoInicial(), 'p1', true), paginaActual: { mates: 25 } };
    await guardarEstado(e);
    expect(await cargarEstado()).toEqual(e);
  });
});

describe('migración', () => {
  it('v1 (temas marcados) pasa a la última página del último tema marcado', () => {
    const v1 = { version: 1, temasDados: { mates: ['mates-t01', 'mates-t02'], musica: [] }, preguntas: {}, sesiones: [] };
    const fin = (id: string) => ({ 'mates-t01': 31, 'mates-t02': 51 })[id];
    const e = migrarYValidar(v1, fin);
    expect(e.version).toBe(VERSION_ESQUEMA);
    expect(e.paginaActual).toEqual({ mates: 51 });
  });
  it('v2 (progreso por pregunta) pasa a v3 conservando respuestas, páginas y ajustes', () => {
    const v2 = { version: 2, paginaActual: { mates: 30 }, preguntas: { 'mates-t01-p01': { aciertos: 2, fallos: 0, ultimaCorrecta: true, ultima: 5 } }, sesiones: [], ajustes: { textoGrande: true, sonido: false } };
    const e = migrarYValidar(v2);
    expect(e.version).toBe(3);
    expect(e.preguntas['mates-t01-p01'].aciertos).toBe(2);
    expect(e.conceptos).toEqual({});
    expect(e.ajustes).toEqual({ textoGrande: true, sonido: false, voz: true, duracion: 'normal' });
  });
  it('al migrar, estima el dominio inicial de cada concepto a partir de las preguntas respondidas', () => {
    const e = sembrarConceptos(registrarRespuesta(registrarRespuesta(estadoInicial(), 'mates-t01-p01', true, 5), 'mates-t01-p03', true, 9), ASIGNATURAS);
    expect(e.conceptos['mates-t01-c01']).toMatchObject({ actividades: 2, caja: 1, nivel: 1, ultima: 9 });
    expect(sembrarConceptos(e, ASIGNATURAS)).toBe(e);
  });
  it('rechaza registros de concepto no válidos', () => {
    const base = { version: 3, paginaActual: {}, preguntas: {}, sesiones: [] };
    expect(() => migrarYValidar({ ...base, conceptos: { c: { nivel: 7 } } })).toThrow(/concepto/);
    expect(() => migrarYValidar({ ...base })).toThrow(/obligatorias/);
  });
  it('rechaza páginas no válidas', () => {
    expect(() => migrarYValidar({ version: 2, paginaActual: { mates: -3 }, preguntas: {}, sesiones: [] })).toThrow(/Página/);
  });
});

describe('copias', () => {
  it('exporta e importa sin pérdida (también el dominio por concepto)', () => {
    const conConcepto = registrarActividad(registrarRespuesta(estadoInicial(), 'p1', true, 5), 'c1', { tipo: 'vf', correcta: true, intentos: 1, pistas: 0, otraManera: false }, 5).estado;
    const e = { ...conConcepto, paginaActual: { lengua: 40 }, ultimaAsignatura: 'lengua' };
    expect(importarCopia(exportarCopia(e))).toEqual(e);
  });
  it('rechaza archivos no válidos', () => {
    expect(() => importarCopia('no es json')).toThrow(/JSON/);
    expect(() => importarCopia('{"a":1}')).toThrow(/copia/);
    expect(() => importarCopia(JSON.stringify({ app: 'paso-a-paso', version: VERSION_ESQUEMA + 1 }))).toThrow(/más nueva/);
    expect(() => importarCopia(JSON.stringify({ app: 'paso-a-paso', version: 2, paginaActual: {}, preguntas: { x: { aciertos: 'mucho' } }, sesiones: [] }))).toThrow();
    expect(() => importarCopia('x'.repeat(6 * 1024 * 1024))).toThrow(/grande/);
  });
});
