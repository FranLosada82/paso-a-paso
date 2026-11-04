import type { Asignatura } from '../../types';
import type { Estado } from '../../storage/estado';
import { conceptosDe, conceptosDisponibles, type ConceptoTutor } from './modelo';
import { avance, conceptoNuevo, situacion, tocaRepasar, type EstadoConcepto, type Situacion } from './dominio';
import { PARAMETROS } from './parametros';

/** Avance medio (0-100) de los conceptos ya dados de unos temas. Solo para mostrar progreso, nunca para comparar. */
export function avanceTemas(estado: Estado, asig: Asignatura, temaIds: string[]): number {
  const pag = estado.paginaActual[asig.id];
  if (pag === undefined) return 0;
  const cs = conceptosDisponibles(asig, temaIds, pag);
  if (!cs.length) return 0;
  return Math.round((cs.reduce((k, c) => k + avance(estado.conceptos[c.id]), 0) / cs.length) * 100);
}

export interface FilaConcepto { c: ConceptoTutor; e?: EstadoConcepto; situacion: Situacion; repasar: boolean }

/** Para la vista del adulto: cada concepto dado con su situación. */
export function resumenAsignatura(estado: Estado, asig: Asignatura, ahora = Date.now()) {
  const pag = estado.paginaActual[asig.id];
  const filas: FilaConcepto[] = pag === undefined ? [] : conceptosDisponibles(asig, asig.temas.map((t) => t.id), pag)
    .map((c) => { const e = estado.conceptos[c.id]; return { c, e, situacion: situacion(e), repasar: tocaRepasar(e, ahora) }; });
  const cuenta = (s: Situacion) => filas.filter((f) => f.situacion === s).length;
  return {
    filas,
    dominados: cuenta('dominado'), aprendiendo: cuenta('aprendiendo'), ayuda: cuenta('ayuda'), nuevos: cuenta('nuevo'),
    porRepasar: filas.filter((f) => f.repasar).length,
  };
}

/**
 * Al pasar de la versión 2 (progreso por pregunta) a la 3 (por concepto): estima el estado inicial de cada concepto
 * a partir de las preguntas ya respondidas, para no empezar de cero. Prudente: nivel 1 y caja 1 como mucho.
 */
export function sembrarConceptos(estado: Estado, asigs: Asignatura[]): Estado {
  if (Object.keys(estado.conceptos).length || !Object.keys(estado.preguntas).length) return estado;
  const conceptos: Record<string, EstadoConcepto> = {};
  for (const a of asigs) for (const c of conceptosDe(a)) {
    const vistas = c.actividades.map((x) => estado.preguntas[x.pregunta.id]).filter((x) => !!x);
    if (!vistas.length) continue;
    const bien = vistas.filter((x) => x.ultimaCorrecta).length / vistas.length;
    const ultima = Math.max(...vistas.map((x) => x.ultima));
    const caja = bien >= 0.8 ? 1 : 0;
    conceptos[c.id] = {
      ...conceptoNuevo(), evidencia: 0.3 + 0.5 * bien, caja, actividades: vistas.length,
      aciertos: vistas.reduce((k, x) => k + x.aciertos, 0), fallos: vistas.reduce((k, x) => k + x.fallos, 0),
      ultima, proximo: ultima + PARAMETROS.repaso.diasPorCaja[caja] * 86400000,
    };
  }
  return { ...estado, conceptos };
}
