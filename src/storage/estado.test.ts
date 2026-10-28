import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { estadoInicial, exportarCopia, importarCopia, registrarRespuesta, VERSION_ESQUEMA } from './estado';
import { cargarEstado, guardarEstado } from './db';

describe('progreso', () => {
  it('registra aciertos y fallos', () => {
    let e = registrarRespuesta(estadoInicial(), 'p1', false, 1);
    e = registrarRespuesta(e, 'p1', true, 2);
    expect(e.preguntas.p1).toEqual({ aciertos: 1, fallos: 1, ultimaCorrecta: true, ultima: 2 });
  });
  it('sobrevive a guardar y volver a abrir (IndexedDB)', async () => {
    const e = { ...registrarRespuesta(estadoInicial(), 'p1', true), temasDados: { mates: ['mates-t01'] } };
    await guardarEstado(e);
    expect(await cargarEstado()).toEqual(e);
  });
});

describe('copias', () => {
  it('exporta e importa sin pérdida', () => {
    const e = { ...registrarRespuesta(estadoInicial(), 'p1', true, 5), temasDados: { lengua: ['lengua-t01'] }, ultimaAsignatura: 'lengua' };
    expect(importarCopia(exportarCopia(e))).toEqual(e);
  });
  it('rechaza archivos no válidos', () => {
    expect(() => importarCopia('no es json')).toThrow(/JSON/);
    expect(() => importarCopia('{"a":1}')).toThrow(/copia/);
    expect(() => importarCopia(JSON.stringify({ app: 'paso-a-paso', version: VERSION_ESQUEMA + 1 }))).toThrow(/más nueva/);
    expect(() => importarCopia(JSON.stringify({ app: 'paso-a-paso', version: 1, temasDados: {}, preguntas: { x: { aciertos: 'mucho' } }, sesiones: [] }))).toThrow();
    expect(() => importarCopia('x'.repeat(6 * 1024 * 1024))).toThrow(/grande/);
  });
});
