import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { estadoInicial, exportarCopia, importarCopia, migrarYValidar, registrarRespuesta, VERSION_ESQUEMA } from './estado';
import { cargarEstado, guardarEstado } from './db';

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
  it('rechaza páginas no válidas', () => {
    expect(() => migrarYValidar({ version: 2, paginaActual: { mates: -3 }, preguntas: {}, sesiones: [] })).toThrow(/Página/);
  });
});

describe('copias', () => {
  it('exporta e importa sin pérdida', () => {
    const e = { ...registrarRespuesta(estadoInicial(), 'p1', true, 5), paginaActual: { lengua: 40 }, ultimaAsignatura: 'lengua' };
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
