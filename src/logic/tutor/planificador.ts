import type { Asignatura, Nivel } from '../../types';
import type { EstadoPregunta } from '../../storage/estado';
import { barajar } from '../aleatorio';
import { PARAMETROS, type Duracion } from './parametros';
import { actividadesHasta, conceptosDisponibles, opcionesOcultasPara, type Actividad, type ConceptoTutor } from './modelo';
import { situacion, tocaRepasar, type EstadoConcepto } from './dominio';

export type Modo = 'aprender' | 'repasar';
export type Fase = 'recordar' | 'descubrir' | 'practicar' | 'aplicar' | 'reto' | 'repasar';

export type Paso =
  | { clase: 'descubrir'; fase: 'descubrir'; concepto: ConceptoTutor; /** Explicación alternativa tras errores repetidos. */ alternativa?: boolean }
  | { clase: 'actividad'; fase: Fase; actividad: Actividad; concepto: ConceptoTutor; ocultas: number[]; refuerzo?: 'parecida' | 'misma' };

export interface Historial { preguntas: Record<string, EstadoPregunta>; conceptos: Record<string, EstadoConcepto> }

interface Opciones { duracion?: Duracion; ahora?: number; rnd?: () => number }

/** Orden de preferencia dentro de un concepto: falladas la última vez, nunca vistas, y las vistas hace más tiempo. */
function porHistorial(h: Historial, rnd: () => number) {
  return (lista: Actividad[]) => {
    const peso = (a: Actividad) => { const x = h.preguntas[a.pregunta.id]; return !x ? 1 : !x.ultimaCorrecta ? 0 : 2; };
    return barajar(lista, rnd).sort((a, b) => peso(a) - peso(b) || (h.preguntas[a.pregunta.id]?.ultima ?? 0) - (h.preguntas[b.pregunta.id]?.ultima ?? 0));
  };
}

/** Prefiere las actividades de nivel más cercano a `objetivo` (sin superarlo si `maximo`). */
function porNivel(lista: Actividad[], objetivo: number, maximo = false): Actividad[] {
  const validas = maximo ? lista.filter((a) => a.nivel <= objetivo) : lista;
  const resto = maximo ? lista.filter((a) => a.nivel > objetivo) : [];
  const d = (a: Actividad) => Math.abs(a.nivel - objetivo);
  return [...[...validas].sort((a, b) => d(a) - d(b)), ...resto];
}

/** Reordena para que no salgan más de N actividades seguidas del mismo tipo. */
export function variar(pasos: Paso[], previos: string[] = [], max = PARAMETROS.maxMismoTipoSeguidas): Paso[] {
  const resto = [...pasos];
  const out: Paso[] = [];
  const tipos = [...previos];
  while (resto.length) {
    const ult = tipos.slice(-max);
    const repetido = ult.length === max && ult.every((t) => t === ult[0]) ? ult[0] : undefined;
    let i = resto.findIndex((p) => p.clase !== 'actividad' || p.actividad.pregunta.tipo !== repetido);
    if (i < 0) i = 0;
    const [p] = resto.splice(i, 1);
    out.push(p);
    tipos.push(p.clase === 'actividad' ? p.actividad.pregunta.tipo : '·');
  }
  return out;
}

const tiposDe = (pasos: Paso[]) => pasos.map((p) => (p.clase === 'actividad' ? p.actividad.pregunta.tipo : '·'));

function paso(fase: Fase, a: Actividad, c: ConceptoTutor, nivelConcepto: Nivel): Paso {
  // En nivel inicial, las preguntas de elegir se muestran con dos opciones.
  return { clase: 'actividad', fase, actividad: a, concepto: c, ocultas: nivelConcepto === 1 && fase !== 'reto' ? opcionesOcultasPara(a.pregunta, 2) : [] };
}

/**
 * Concepto en el que se centra una sesión de «Aprender»: primero lo que cuesta, después lo que está a medio aprender,
 * después lo nuevo en el orden del libro. Lo ya encaminado no bloquea lo nuevo: vuelve en los repasos espaciados.
 */
export function elegirFoco(disp: ConceptoTutor[], h: Historial, ahora: number): ConceptoTutor[] {
  const D = PARAMETROS.dominio;
  const grupo = (c: ConceptoTutor) => {
    const e = h.conceptos[c.id]; const s = situacion(e);
    if (s === 'ayuda') return 0;
    if (s === 'aprendiendo' && (e!.evidencia < D.avanzarEvidencia || e!.nivel < D.avanzarNivel)) return 1;
    if (s === 'nuevo') return 2;
    return s === 'aprendiendo' ? 3 : 4;
  };
  const proximo = (c: ConceptoTutor) => h.conceptos[c.id]?.proximo ?? ahora;
  // En los grupos ya encaminados o dominados, antes lo que antes toca repasar.
  return [...disp].sort((a, b) => grupo(a) - grupo(b) || (grupo(a) >= 3 ? proximo(a) - proximo(b) : 0) || a.orden - b.orden).slice(0, 1);
}

/**
 * Sesión de «Aprender» en cinco fases: recordar algo anterior, descubrir el concepto, practicar con ayuda,
 * pensar y aplicar, y un reto final.
 */
export function planAprender(asig: Asignatura, temaIds: string[], pagina: number, h: Historial, o: Opciones = {}): Paso[] {
  const { duracion = 'normal', ahora = Date.now(), rnd = Math.random } = o;
  const N = PARAMETROS.sesion[duracion];
  const disp = conceptosDisponibles(asig, temaIds, pagina);
  if (!disp.length) return [];
  const ordenar = porHistorial(h, rnd);
  const foco = elegirFoco(disp, h, ahora);
  const necesarias = N.practicar + N.aplicar + N.reto;
  // Si el concepto tiene pocas actividades, se suma el siguiente.
  for (const c of [...disp].sort((a, b) => a.orden - b.orden)) {
    if (foco.reduce((k, f) => k + actividadesHasta(f, pagina).length, 0) >= necesarias) break;
    if (!foco.includes(c) && situacion(h.conceptos[c.id]) !== 'dominado') foco.push(c);
  }
  const usadas = new Set<string>();
  const tomar = (fase: Fase, c: ConceptoTutor, lista: Actividad[], k: number): Paso[] => {
    const nv = h.conceptos[c.id]?.nivel ?? 1;
    return lista.filter((a) => !usadas.has(a.pregunta.id)).slice(0, k).map((a) => { usadas.add(a.pregunta.id); return paso(fase, a, c, nv); });
  };

  // 1. Recordar: conceptos ya trabajados de otras sesiones que toca repasar.
  const repasar = disp.filter((c) => !foco.includes(c) && tocaRepasar(h.conceptos[c.id], ahora))
    .sort((a, b) => (h.conceptos[a.id]?.proximo ?? 0) - (h.conceptos[b.id]?.proximo ?? 0));
  const recordar: Paso[] = [];
  for (const c of repasar) {
    if (recordar.length >= N.recordar) break;
    recordar.push(...tomar('recordar', c, porNivel(ordenar(actividadesHasta(c, pagina)), h.conceptos[c.id]?.nivel ?? 1, true), 1));
  }

  // 2-3. Descubrir cada concepto y practicarlo con ayuda (nivel del concepto o menos), una idea cada vez.
  // 4-5. Después, aplicar (nivel superior) y un reto (lo más difícil).
  const descubrirYPracticar: Paso[] = []; const aplicar: Paso[] = []; const reto: Paso[] = [];
  foco.forEach((c, i) => {
    const nv = h.conceptos[c.id]?.nivel ?? 1;
    const propias = ordenar(actividadesHasta(c, pagina));
    const parte = (k: number) => Math.ceil(k / foco.length) + (i === 0 ? 0 : -1);
    const practicar = tomar('practicar', c, porNivel(propias, Math.min(nv, 2), true), Math.max(1, parte(N.practicar)));
    descubrirYPracticar.push({ clase: 'descubrir', fase: 'descubrir', concepto: c }, ...variar(practicar, tiposDe(descubrirYPracticar)));
    aplicar.push(...tomar('aplicar', c, porNivel(propias, Math.min(3, nv + 1)), Math.max(1, parte(N.aplicar))));
  });
  const todasFoco = foco.flatMap((c) => actividadesHasta(c, pagina).map((a) => ({ a, c })));
  const candidatasReto = todasFoco.filter(({ a }) => !usadas.has(a.pregunta.id)).sort((x, y) => y.a.nivel - x.a.nivel);
  for (const { a, c } of candidatasReto.slice(0, N.reto)) { usadas.add(a.pregunta.id); reto.push(paso('reto', a, c, h.conceptos[c.id]?.nivel ?? 1)); }
  if (!reto.length) {
    // Sin actividades nuevas para el reto: se combina con un concepto anterior ya trabajado.
    const otro = disp.filter((c) => !foco.includes(c) && h.conceptos[c.id]?.actividades).flatMap((c) => actividadesHasta(c, pagina).map((a) => ({ a, c })))
      .filter(({ a }) => !usadas.has(a.pregunta.id)).sort((x, y) => y.a.nivel - x.a.nivel)[0];
    if (otro) { usadas.add(otro.a.pregunta.id); reto.push(paso('reto', otro.a, otro.c, h.conceptos[otro.c.id]?.nivel ?? 1)); }
  }

  const r = variar(recordar);
  const ap = variar(aplicar, tiposDe(descubrirYPracticar));
  return [...r, ...descubrirYPracticar, ...ap, ...reto];
}

/**
 * Sesión de «Repasar»: recuperación mezclada de todo lo dado, sin pistas al principio. Prioriza lo que toca repasar
 * (repetición espaciada) y lo que cuesta, intercalando conceptos.
 */
export function planRepasar(asig: Asignatura, temaIds: string[], pagina: number, h: Historial, o: Opciones = {}): Paso[] {
  const { duracion = 'normal', ahora = Date.now(), rnd = Math.random } = o;
  const total = PARAMETROS.sesion[duracion].repasar;
  const disp = conceptosDisponibles(asig, temaIds, pagina);
  const ordenar = porHistorial(h, rnd);
  const prioridad = (c: ConceptoTutor) => {
    const e = h.conceptos[c.id];
    if (tocaRepasar(e, ahora)) return 0;
    const s = situacion(e);
    return s === 'ayuda' ? 1 : s === 'nuevo' ? 2 : s === 'aprendiendo' ? 3 : 4;
  };
  const conceptos = barajar(disp, rnd).sort((a, b) => prioridad(a) - prioridad(b));
  const colas = new Map(conceptos.map((c) => [c.id, porNivel(ordenar(actividadesHasta(c, pagina)), h.conceptos[c.id]?.nivel ?? 2)]));
  const pasos: Paso[] = [];
  // Reparto por rondas: un concepto distinto cada vez (práctica intercalada).
  while (pasos.length < total) {
    let puesto = false;
    for (const c of conceptos) {
      const a = colas.get(c.id)!.shift();
      if (!a) continue;
      pasos.push({ clase: 'actividad', fase: 'repasar', actividad: a, concepto: c, ocultas: [] });
      puesto = true;
      if (pasos.length >= total) break;
    }
    if (!puesto) break;
  }
  return variar(pasos);
}

export function crearPlan(modo: Modo, asig: Asignatura, temaIds: string[], pagina: number, h: Historial, o?: Opciones): Paso[] {
  return modo === 'aprender' ? planAprender(asig, temaIds, pagina, h, o) : planRepasar(asig, temaIds, pagina, h, o);
}

/** Actividad parecida pero no idéntica (mismo concepto, nivel igual o menor) para reforzar tras un error. */
export function actividadSimilar(c: ConceptoTutor, actual: Actividad, pagina: number, usadas: Set<string>, h: Historial, rnd: () => number = Math.random): Actividad | undefined {
  const otras = actividadesHasta(c, pagina).filter((a) => a.pregunta.id !== actual.pregunta.id && !usadas.has(a.pregunta.id));
  return porNivel(porHistorial(h, rnd)(otras), actual.nivel, true)[0];
}
