import { describe, expect, it } from 'vitest';
import type { Asignatura, Pregunta, TipoPregunta } from '../../types';
import { actualizarConcepto, situacion, tocaRepasar, type EstadoConcepto, type ResultadoActividad } from './dominio';
import { actividadSimilar, planAprender, planRepasar, variar, type Historial, type Paso } from './planificador';
import { conceptosDe, pistaEstructural } from './modelo';
import { problemasPregunta } from './validar';
import { sinFelicitacion } from './mensajes';
import { PARAMETROS } from './parametros';
import { ASIGNATURAS } from '../../content/asignaturas';

const DIA = 86400000;
const T0 = Date.UTC(2026, 10, 2, 17);
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

const limpia = (tipo: TipoPregunta): ResultadoActividad => ({ tipo, correcta: true, intentos: 1, pistas: 0, otraManera: false });
const fallo = (tipo: TipoPregunta): ResultadoActividad => ({ tipo, correcta: false, intentos: 2, pistas: 1, otraManera: false });

function aplicar(rs: ResultadoActividad[], ahora = T0, prev?: EstadoConcepto) {
  let e = prev; let ultimo;
  for (const r of rs) { ultimo = actualizarConcepto(e, r, ahora); e = ultimo.estado; }
  return { e: e!, ultimo: ultimo! };
}

describe('motor de dificultad', () => {
  it('sube de nivel con aciertos limpios en tipos distintos', () => {
    const { e, ultimo } = aplicar([limpia('eleccion'), limpia('vf'), limpia('escribir')]);
    expect(ultimo.cambio).toBe('sube');
    expect(e.nivel).toBe(2);
  });
  it('no sube si todos los aciertos son del mismo tipo de actividad', () => {
    const { e } = aplicar([limpia('vf'), limpia('vf'), limpia('vf'), limpia('vf')]);
    expect(e.nivel).toBe(1);
  });
  it('las pistas y los reintentos no cuentan como dominio limpio', () => {
    const conPista = { ...limpia('eleccion'), pistas: 1 };
    const { e } = aplicar([conPista, { ...limpia('vf'), intentos: 2 }, conPista, limpia('escribir')]);
    expect(e.nivel).toBe(1);
    expect(e.racha).toBe(1);
  });
  it('dos errores seguidos en el concepto: baja un nivel y pide otra explicación', () => {
    const subido = aplicar([limpia('eleccion'), limpia('vf'), limpia('escribir')]).e;
    const r1 = actualizarConcepto(subido, fallo('eleccion'), T0);
    expect(r1.otraExplicacion).toBe(false);
    const r2 = actualizarConcepto(r1.estado, fallo('vf'), T0);
    expect(r2.otraExplicacion).toBe(true);
    expect(r2.cambio).toBe('baja');
    expect(r2.estado.nivel).toBe(1);
  });
  it('en nivel 1 nunca baja de 1, pero sí pide otra explicación', () => {
    const r = aplicar([fallo('vf'), fallo('vf')]).ultimo;
    expect(r.estado.nivel).toBe(1);
    expect(r.otraExplicacion).toBe(true);
  });
  it('los umbrales salen de PARAMETROS', () => {
    expect(PARAMETROS.nivel.subirTrasAciertos).toBeGreaterThan(1);
    expect(PARAMETROS.repaso.diasPorCaja[0]).toBe(0);
  });
});

describe('repetición espaciada', () => {
  it('acertar mucho el mismo día solo sube una caja', () => {
    const { e } = aplicar([limpia('vf'), limpia('eleccion'), limpia('escribir'), limpia('vf')]);
    expect(e.caja).toBe(1);
    expect(e.proximo).toBe(T0 + DIA);
    expect(tocaRepasar(e, T0 + DIA / 2)).toBe(false);
    expect(tocaRepasar(e, T0 + DIA)).toBe(true);
  });
  it('repasos en su día amplían el intervalo: 1, 3, 7 días…', () => {
    let { e } = aplicar([limpia('vf')]);
    let t = T0;
    for (const dias of [3, 7, 14]) {
      t = e.proximo;
      e = actualizarConcepto(e, limpia('eleccion'), t).estado;
      expect(e.proximo - t).toBe(dias * DIA);
    }
  });
  it('un fallo devuelve el concepto a repasos cercanos', () => {
    let { e } = aplicar([limpia('vf')]);
    for (let i = 0; i < 3; i++) e = actualizarConcepto(e, limpia('eleccion'), e.proximo).estado;
    expect(e.caja).toBe(4);
    e = actualizarConcepto(e, fallo('vf'), e.proximo).estado;
    expect(e.caja).toBe(2);
  });
  it('dominado solo tras varios días, nivel suficiente y buena evidencia', () => {
    let { e } = aplicar([limpia('vf'), limpia('eleccion'), limpia('escribir')]);
    expect(situacion(e)).toBe('aprendiendo');
    for (let i = 0; i < 3; i++) e = actualizarConcepto(e, limpia(i % 2 ? 'ordenar' : 'relacionar'), e.proximo).estado;
    expect(situacion(e)).toBe('dominado');
  });
  it('le cuesta: evidencia baja tras varios intentos', () => {
    expect(situacion(aplicar([fallo('vf'), fallo('eleccion'), fallo('vf')]).e)).toBe('ayuda');
  });
});

// Asignatura de prueba con dos temas y conceptos escritos.
const q = (id: string, tipo: TipoPregunta, concepto: string, nivel: 1 | 2 | 3, pagina: number): Pregunta => {
  const base = { id, enunciado: `¿${id}?`, explicacion: 'Porque sí.', concepto, nivel, pagina };
  switch (tipo) {
    case 'vf': return { ...base, tipo, correcta: true };
    case 'eleccion': return { ...base, tipo, opciones: ['uno', 'dos', 'tres'], correcta: 1 };
    case 'escribir': return { ...base, tipo, respuestas: ['siete'] };
    case 'ordenar': return { ...base, tipo, elementos: ['a', 'b', 'c'] };
    case 'relacionar': return { ...base, tipo, pares: [['a', 'A'], ['b', 'B'], ['c', 'C']] };
  }
};
const concepto = (id: string, pagina: number) => ({
  id, nombre: id, objetivo: 'x', pagina,
  descubre: 'Una explicación corta para niños de siete años con un ejemplo cotidiano y una sola idea principal cada vez.',
  otraManera: [{ estilo: 'ejemplo' as const, texto: 'Con juguetes.' }, { estilo: 'pasos' as const, texto: '1. Uno. 2. Dos.' }],
});
const tipos: TipoPregunta[] = ['vf', 'eleccion', 'escribir', 'ordenar', 'relacionar'];
const prueba: Asignatura = {
  id: 'x', nombre: 'X', libro: '', idioma: 'es',
  temas: [
    { id: 'x-t01', numero: 1, titulo: 'Uno', paginas: '10-19', explicacion: 'Tema uno.',
      conceptos: [concepto('x-t01-c01', 10), concepto('x-t01-c02', 15)],
      preguntas: [
        ...Array.from({ length: 10 }, (_, i) => q(`x-t01-p${i}`, tipos[i % 5], 'x-t01-c01', ((i % 3) + 1) as 1 | 2 | 3, 10)),
        ...Array.from({ length: 10 }, (_, i) => q(`x-t01-q${i}`, tipos[i % 5], 'x-t01-c02', ((i % 3) + 1) as 1 | 2 | 3, 15)),
      ] },
    { id: 'x-t02', numero: 2, titulo: 'Dos', paginas: '20-29', explicacion: 'Tema dos sin conceptos escritos. Usa el tema entero.',
      preguntas: Array.from({ length: 8 }, (_, i) => ({ ...q(`x-t02-p${i}`, tipos[i % 5], '', 2, 20 + i), concepto: undefined })) },
  ],
};
const vacio: Historial = { preguntas: {}, conceptos: {} };
const actividades = (pl: Paso[]) => pl.filter((p) => p.clase === 'actividad');

describe('capa pedagógica sobre el contenido', () => {
  it('agrupa por concepto y usa el tema como concepto cuando no hay conceptos escritos', () => {
    const cs = conceptosDe(prueba);
    expect(cs.map((c) => c.id)).toEqual(['x-t01-c01', 'x-t01-c02', 'x-t02']);
    expect(cs[2].derivado).toBe(true);
    expect(cs[2].otraManera.length).toBeGreaterThan(0);
  });
  it('excluye preguntas marcadas para revisar o ambiguas', () => {
    const a: Asignatura = { ...prueba, temas: [{ ...prueba.temas[1], id: 'y-t01', preguntas: [
      ...prueba.temas[1].preguntas,
      { ...q('dudosa', 'vf', '', 1, 20), concepto: undefined, revisar: true },
      { id: 'ambigua', tipo: 'eleccion', enunciado: '¿?', explicacion: 'x', opciones: ['perro', ' perro'], correcta: 0, pagina: 20 },
    ] }] };
    const ids = conceptosDe(a).flatMap((c) => c.actividades.map((x) => x.pregunta.id));
    expect(ids).not.toContain('dudosa');
    expect(ids).not.toContain('ambigua');
  });
  it('pistas progresivas: primero de pensar, después la que cambia el ejercicio', () => {
    const act = conceptosDe(prueba)[0].actividades.find((x) => x.pregunta.tipo === 'eleccion')!;
    expect(act.pistas[0].texto).toMatch(/^Recuerda/);
    expect(act.pistas.at(-1)!.ayuda?.tipo).toBe('quitar-opcion');
    const p = act.pregunta as Pregunta & { tipo: 'eleccion' };
    expect((act.pistas.at(-1)!.ayuda as { indice: number }).indice).not.toBe(p.correcta);
  });
  it('la pista de escribir no da la respuesta entera', () => {
    const p: Pregunta = { id: 'e', tipo: 'escribir', enunciado: '¿?', explicacion: 'x', respuestas: ['37'] };
    expect(pistaEstructural(p)!.texto).not.toContain('37');
  });
});

describe('sesión «Aprender»', () => {
  it('una idea cada vez: cada concepto se presenta justo antes de practicarlo', () => {
    const pl = planAprender(prueba, ['x-t01'], 99, vacio, { rnd, duracion: 'larga' });
    let actual = '';
    for (const p of pl) {
      if (p.clase === 'descubrir') actual = p.concepto.id;
      else if (p.fase === 'practicar') expect(p.concepto.id).toBe(actual);
    }
  });
  it('sigue las fases: descubrir, practicar, aplicar y reto (sin nada que recordar el primer día)', () => {
    const pl = planAprender(prueba, ['x-t01'], 99, vacio, { rnd });
    expect(pl[0].clase).toBe('descubrir');
    const fases = pl.map((p) => p.fase);
    expect(fases.indexOf('practicar')).toBeLessThan(fases.indexOf('aplicar'));
    expect(fases.at(-1)).toBe('reto');
    expect(new Set(actividades(pl).map((p) => p.actividad.pregunta.id)).size).toBe(actividades(pl).length);
  });
  it('enseña primero el primer concepto del libro y practica en nivel inicial con dos opciones', () => {
    const pl = planAprender(prueba, ['x-t01'], 99, vacio, { rnd });
    const d = pl.find((p) => p.clase === 'descubrir')!;
    expect(d.concepto.id).toBe('x-t01-c01');
    const practica = actividades(pl).filter((p) => p.fase === 'practicar');
    expect(practica.every((p) => p.actividad.nivel === 1)).toBe(true);
    for (const p of practica) if (p.actividad.pregunta.tipo === 'eleccion') expect(p.ocultas.length).toBe(1);
  });
  it('el reto es de mayor nivel que la práctica', () => {
    const pl = planAprender(prueba, ['x-t01'], 99, vacio, { rnd });
    const reto = actividades(pl).find((p) => p.fase === 'reto')!;
    expect(reto.actividad.nivel).toBe(3);
  });
  it('solo usa lo dado en clase (temas y página)', () => {
    const pl = planAprender(prueba, ['x-t01'], 12, vacio, { rnd });
    expect(actividades(pl).every((p) => p.concepto.id === 'x-t01-c01')).toBe(true);
    expect(planAprender(prueba, [], 99, vacio)).toEqual([]);
  });
  it('con el primer concepto dominado, pasa al siguiente y recuerda lo que toca repasar', () => {
    const dominado: EstadoConcepto = { ...aplicar([limpia('vf')]).e, nivel: 3, caja: 4, evidencia: 0.95, actividades: 12, proximo: T0 - 1 };
    const pl = planAprender(prueba, ['x-t01'], 99, { preguntas: {}, conceptos: { 'x-t01-c01': dominado } }, { rnd, ahora: T0 });
    expect(pl[0].fase).toBe('recordar');
    expect(pl[0].clase === 'actividad' && pl[0].concepto.id).toBe('x-t01-c01');
    expect(pl.find((p) => p.clase === 'descubrir')!.concepto.id).toBe('x-t01-c02');
  });
  it('con nivel más alto, la fase de aplicar elige actividades más difíciles', () => {
    const nivel2: EstadoConcepto = { ...aplicar([limpia('vf')]).e, nivel: 2 };
    const pl = planAprender(prueba, ['x-t01'], 99, { preguntas: {}, conceptos: { 'x-t01-c01': nivel2 } }, { rnd, ahora: T0 });
    const aplicarFase = actividades(pl).filter((p) => p.fase === 'aplicar' && p.concepto.id === 'x-t01-c01');
    expect(aplicarFase.every((p) => p.actividad.nivel === 3)).toBe(true);
  });
});

describe('sesión «Repasar»', () => {
  it('intercala conceptos y prioriza los que toca repasar', () => {
    const debido: EstadoConcepto = { ...aplicar([limpia('vf')]).e, proximo: T0 - 1 };
    const fresco: EstadoConcepto = { ...debido, proximo: T0 + 5 * DIA };
    const h: Historial = { preguntas: {}, conceptos: { 'x-t01-c02': debido, 'x-t01-c01': fresco, 'x-t02': fresco } };
    const pl = planRepasar(prueba, ['x-t01', 'x-t02'], 99, h, { rnd, ahora: T0 });
    expect(pl.length).toBe(PARAMETROS.sesion.normal.repasar);
    expect(pl.every((p) => p.clase === 'actividad' && p.ocultas.length === 0)).toBe(true);
    expect(new Set(actividades(pl).map((p) => p.concepto.id)).size).toBe(3);
    expect(actividades(pl).slice(0, 3).some((p) => p.concepto.id === 'x-t01-c02')).toBe(true);
  });
  it('prioriza las preguntas falladas', () => {
    const h: Historial = { preguntas: { 'x-t01-p4': { aciertos: 0, fallos: 1, ultimaCorrecta: false, ultima: 1 } }, conceptos: {} };
    for (let k = 0; k < 10; k++) expect(actividades(planRepasar(prueba, ['x-t01'], 99, h, { rnd })).some((p) => p.actividad.pregunta.id === 'x-t01-p4')).toBe(true);
  });
});

describe('variedad y refuerzo', () => {
  it('no hay más de dos actividades seguidas del mismo tipo si se puede evitar', () => {
    for (let k = 0; k < 20; k++) {
      const pl = planRepasar(prueba, ['x-t01', 'x-t02'], 99, vacio, { rnd, duracion: 'larga' });
      const t = actividades(pl).map((p) => p.actividad.pregunta.tipo);
      for (let i = 2; i < t.length; i++) expect(t[i] === t[i - 1] && t[i] === t[i - 2], t.join(',')).toBe(false);
    }
  });
  it('variar respeta la fase anterior', () => {
    const c = conceptosDe(prueba)[0];
    const vfs = c.actividades.filter((a) => a.pregunta.tipo === 'vf').map((actividad): Paso => ({ clase: 'actividad', fase: 'practicar', actividad, concepto: c, ocultas: [] }));
    const otro: Paso = { clase: 'actividad', fase: 'practicar', actividad: c.actividades.find((a) => a.pregunta.tipo === 'escribir')!, concepto: c, ocultas: [] };
    const r = variar([...vfs, otro], ['vf', 'vf']);
    expect(r[0]).toBe(otro);
  });
  it('tras un error propone una actividad parecida pero no idéntica', () => {
    const c = conceptosDe(prueba)[0];
    const a = c.actividades.find((x) => x.nivel === 2)!;
    const s = actividadSimilar(c, a, 99, new Set([a.pregunta.id]), vacio, rnd)!;
    expect(s.pregunta.id).not.toBe(a.pregunta.id);
    expect(s.conceptoId).toBe(c.id);
    expect(s.nivel).toBeLessThanOrEqual(a.nivel);
  });
});

describe('feedback', () => {
  it('quita la felicitación de una explicación cuando el niño ha fallado', () => {
    expect(sinFelicitacion('¡Bien! Una decena es un grupo de 10.')).toBe('Una decena es un grupo de 10.');
    expect(sinFelicitacion('Well done! Cats are mammals.')).toBe('Cats are mammals.');
    expect(sinFelicitacion('¡Ojo! El 7 va primero.')).toBe('¡Ojo! El 7 va primero.');
  });
  it('detecta pistas que dan la respuesta', () => {
    const p: Pregunta = { id: 'p', tipo: 'eleccion', enunciado: '¿?', explicacion: 'x', opciones: ['gato', 'perro'], correcta: 0, pistas: ['Es el gato.'] };
    expect(problemasPregunta(p).join()).toMatch(/contiene la respuesta/);
  });
});

describe('simulación con el contenido real (Matemáticas, tema 1)', () => {
  const mates = ASIGNATURAS.find((a) => a.id === 'mates')!;
  it('un niño que acierta va avanzando de concepto, nivel y repaso a lo largo de los días', () => {
    let h: Historial = { preguntas: {}, conceptos: {} };
    let t = T0;
    const focos: string[] = [];
    for (let dia = 0; dia < 12; dia++, t += DIA) {
      const pl = planAprender(mates, ['mates-t01'], 31, h, { rnd, ahora: t });
      focos.push(...pl.flatMap((p) => (p.clase === 'descubrir' ? [p.concepto.id] : [])));
      for (const p of actividades(pl)) {
        const prev = h.conceptos[p.concepto.id];
        h = { ...h, conceptos: { ...h.conceptos, [p.concepto.id]: actualizarConcepto(prev, limpia(p.actividad.pregunta.tipo), t).estado } };
      }
    }
    // Recorre los conceptos en el orden del libro y termina con todos trabajados.
    expect(focos.slice(0, 3)).toEqual(['mates-t01-c01', 'mates-t01-c02', 'mates-t01-c03']);
    expect(Object.keys(h.conceptos).length).toBe(5);
    expect(Math.max(...Object.values(h.conceptos).map((e) => e.nivel))).toBeGreaterThanOrEqual(2);
    expect(Object.values(h.conceptos).some((e) => situacion(e) === 'dominado')).toBe(true);
  });
});
