import type { Asignatura, Concepto, Nivel, Pregunta, Tema } from '../../types';
import { paginaDe, rangoTema } from '../paginas';
import { problemasPregunta } from './validar';

/** Ayuda que cambia el ejercicio además de dar un texto. */
export type AyudaEjercicio =
  | { tipo: 'quitar-opcion'; indice: number }
  | { tipo: 'primer-elemento' }
  | { tipo: 'una-pareja' };

export interface Pista { texto: string; ayuda?: AyudaEjercicio }

/** Pregunta con todo lo que el tutor necesita: concepto, nivel, pistas progresivas y origen. */
export interface Actividad {
  pregunta: Pregunta;
  tema: Tema;
  conceptoId: string;
  nivel: Nivel;
  pistas: Pista[];
}

export interface ConceptoTutor extends Concepto {
  asignatura: string;
  tema: Tema;
  /** true si el tema no tiene conceptos escritos y se usa el tema entero como concepto. */
  derivado: boolean;
  /** Posición en el libro (para ordenar por progresión). */
  orden: number;
  actividades: Actividad[];
}

/** Nivel estimado por la forma de la pregunta cuando el contenido no lo indica. */
export function nivelEstimado(p: Pregunta): Nivel {
  switch (p.tipo) {
    case 'vf': return 1;
    case 'eleccion': return p.opciones.length <= 2 ? 1 : 2;
    case 'ordenar':
    case 'relacionar': return 2;
    case 'escribir': return p.enunciado.length > 70 ? 3 : 2;
  }
}

/** Índice estable de una opción incorrecta (siempre la misma para la misma pregunta). */
function incorrectaEstable(p: Pregunta & { tipo: 'eleccion' }, salto = 0): number {
  const malas = p.opciones.map((_, i) => i).filter((i) => i !== p.correcta);
  let h = 0;
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return malas[(h + salto) % malas.length];
}

/** Pista que modifica el ejercicio, calculada a partir de la propia pregunta (no puede inventar contenido). */
export function pistaEstructural(p: Pregunta): Pista | undefined {
  switch (p.tipo) {
    case 'eleccion':
      return p.opciones.length >= 3 ? { texto: 'Te quito una opción que no es.', ayuda: { tipo: 'quitar-opcion', indice: incorrectaEstable(p) } } : undefined;
    case 'escribir': {
      const r = p.respuestas[0].trim();
      if (r.length < 2) return undefined;
      return { texto: /^\d+$/.test(r) ? `El número tiene ${r.length} cifras y empieza por ${r[0]}.` : `Empieza por «${r[0].toUpperCase()}».` };
    }
    case 'ordenar': return { texto: `El primero es «${p.elementos[0]}». Ya te lo pongo.`, ayuda: { tipo: 'primer-elemento' } };
    case 'relacionar': return { texto: 'Te uno una pareja para empezar.', ayuda: { tipo: 'una-pareja' } };
    case 'vf': return undefined;
  }
}

/** Opciones que se ocultan para dejar solo `n` (la correcta siempre queda). Para el nivel inicial. */
export function opcionesOcultasPara(p: Pregunta, n: number): number[] {
  if (p.tipo !== 'eleccion' || p.opciones.length <= n) return [];
  const ocultas: number[] = [];
  for (let s = 0; ocultas.length < p.opciones.length - n; s++) {
    const i = incorrectaEstable(p, s);
    if (!ocultas.includes(i)) ocultas.push(i);
  }
  return ocultas;
}

const recordatorio = (c: { descubre: string }) => `Recuerda: ${c.descubre}`;

function pistasDe(p: Pregunta, concepto: { descubre: string }): Pista[] {
  const escritas = (p.pistas ?? []).map((texto) => ({ texto }));
  const estructural = pistaEstructural(p);
  const lista = escritas.length ? escritas : [{ texto: recordatorio(concepto) }];
  return estructural ? [...lista, estructural] : lista;
}

/** Explicación del tema partida en pasos: «otra manera» cuando el tema aún no tiene conceptos escritos. */
function enPasos(texto: string): string {
  const frases = texto.split(/(?<=[.!?])\s+/).filter(Boolean);
  return frases.length > 1 ? frases.map((f, i) => `${i + 1}. ${f}`).join('\n') : texto;
}

const cache = new WeakMap<Asignatura, ConceptoTutor[]>();

/**
 * Capa pedagógica entre el contenido y las sesiones: agrupa las preguntas válidas por concepto, con nivel y pistas.
 * Las preguntas marcadas para revisar o con problemas de validación se excluyen.
 */
export function conceptosDe(asig: Asignatura): ConceptoTutor[] {
  const hecho = cache.get(asig);
  if (hecho) return hecho;
  const lista: ConceptoTutor[] = [];
  for (const tema of asig.temas) {
    const propios: ConceptoTutor[] = (tema.conceptos ?? []).map((c) => ({ ...c, asignatura: asig.id, tema, derivado: false, orden: 0, actividades: [] }));
    let general: ConceptoTutor | undefined;
    const delTema = () => (general ??= {
      id: tema.id, nombre: tema.titulo, objetivo: tema.resumen ?? tema.titulo, descubre: tema.explicacion,
      otraManera: [{ estilo: 'pasos', texto: enPasos(tema.explicacion) }], pagina: rangoTema(tema).ini,
      asignatura: asig.id, tema, derivado: true, orden: 0, actividades: [],
    });
    for (const p of tema.preguntas) {
      if (p.revisar || problemasPregunta(p).length) continue;
      const c = propios.find((x) => x.id === p.concepto) ?? delTema();
      c.actividades.push({ pregunta: p, tema, conceptoId: c.id, nivel: p.nivel ?? nivelEstimado(p), pistas: pistasDe(p, c) });
    }
    for (const c of [...propios, ...(general ? [general] : [])]) if (c.actividades.length) lista.push(c);
  }
  lista.forEach((c, i) => { c.orden = i; });
  cache.set(asig, lista);
  return lista;
}

/** Actividades ya trabajadas en clase (hasta la página indicada). */
export function actividadesHasta(c: ConceptoTutor, pagina: number): Actividad[] {
  return c.actividades.filter((a) => paginaDe(a.pregunta, a.tema) <= pagina);
}

/** Conceptos de los temas indicados con alguna actividad ya trabajada en clase. */
export function conceptosDisponibles(asig: Asignatura, temaIds: string[], pagina: number): ConceptoTutor[] {
  return conceptosDe(asig).filter((c) => temaIds.includes(c.tema.id) && (c.pagina ?? 0) <= pagina && actividadesHasta(c, pagina).length > 0);
}

export function buscarConcepto(asigs: Asignatura[], id: string): ConceptoTutor | undefined {
  for (const a of asigs) { const c = conceptosDe(a).find((x) => x.id === id); if (c) return c; }
  return undefined;
}
