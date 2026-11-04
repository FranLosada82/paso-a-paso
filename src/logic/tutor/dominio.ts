import type { Nivel, TipoPregunta } from '../../types';
import { PARAMETROS } from './parametros';

const DIA = 24 * 60 * 60 * 1000;

/** Lo que el tutor sabe de un concepto para este niño. */
export interface EstadoConcepto {
  nivel: Nivel;
  /** Media móvil 0-1 de la calidad de las respuestas (acierto a la primera, ayudas, intentos). */
  evidencia: number;
  /** Caja de repaso espaciado (0 = repasar ya). */
  caja: number;
  /** Aciertos seguidos a la primera y sin ayuda en el nivel actual, y sus tipos de actividad. */
  racha: number;
  tiposRacha: TipoPregunta[];
  /** Actividades seguidas con error al primer intento. */
  fallosSeguidos: number;
  actividades: number;
  aciertos: number;
  fallos: number;
  pistas: number;
  otraManera: number;
  ultima: number;
  proximo: number;
}

export interface ResultadoActividad {
  tipo: TipoPregunta;
  /** Acertada al final (en el primer o segundo intento). */
  correcta: boolean;
  intentos: number;
  pistas: number;
  otraManera: boolean;
}

export type Cambio = 'sube' | 'baja' | null;

export function conceptoNuevo(): EstadoConcepto {
  return { nivel: 1, evidencia: 0.3, caja: 0, racha: 0, tiposRacha: [], fallosSeguidos: 0, actividades: 0, aciertos: 0, fallos: 0, pistas: 0, otraManera: 0, ultima: 0, proximo: 0 };
}

export function puntuacion(r: ResultadoActividad): number {
  const E = PARAMETROS.evidencia;
  const ayudas = r.pistas + (r.otraManera ? 1 : 0);
  const base = !r.correcta ? E.fallada : r.intentos > 1 ? E.reintento : ayudas ? E.primeraConPistas : E.primeraSinPistas;
  return Math.max(0, Math.min(1, base - (r.correcta && ayudas ? E.porAyuda * Math.max(0, ayudas - 1) : 0)));
}

/**
 * Actualiza el concepto tras una actividad. El nivel no depende solo del porcentaje de aciertos: cuentan los intentos,
 * las ayudas y que se acierte en tipos de actividad distintos. El tiempo de respuesta no se usa.
 */
export function actualizarConcepto(prev: EstadoConcepto | undefined, r: ResultadoActividad, ahora = Date.now()):
  { estado: EstadoConcepto; cambio: Cambio; otraExplicacion: boolean } {
  const P = PARAMETROS;
  const e: EstadoConcepto = { ...(prev ?? conceptoNuevo()), tiposRacha: [...(prev?.tiposRacha ?? [])] };
  const primera = r.correcta && r.intentos <= 1;
  const limpia = primera && r.pistas === 0 && !r.otraManera;
  const tocaRepaso = e.caja === 0 || ahora >= e.proximo;

  e.evidencia = e.evidencia * (1 - P.evidencia.alfa) + puntuacion(r) * P.evidencia.alfa;
  e.actividades++; e.ultima = ahora;
  if (r.correcta) e.aciertos++;
  if (!primera) e.fallos++;
  e.pistas += r.pistas; if (r.otraManera) e.otraManera++;

  if (limpia) {
    e.racha++; if (!e.tiposRacha.includes(r.tipo)) e.tiposRacha.push(r.tipo);
    e.fallosSeguidos = 0;
  } else {
    e.racha = 0; e.tiposRacha = [];
    e.fallosSeguidos = primera ? 0 : e.fallosSeguidos + 1;
  }

  // Repetición espaciada: la caja solo sube cuando tocaba repasar (no por acertar muchas veces el mismo día).
  const cajas = P.repaso.diasPorCaja.length - 1;
  if (limpia && tocaRepaso) e.caja = Math.min(cajas, e.caja + 1);
  else if (!primera) e.caja = Math.max(0, e.caja - P.repaso.bajarCajasAlFallar);
  e.proximo = ahora + P.repaso.diasPorCaja[e.caja] * DIA;

  let cambio: Cambio = null;
  const otraExplicacion = e.fallosSeguidos >= P.nivel.bajarTrasFallos;
  if (e.racha >= P.nivel.subirTrasAciertos && e.tiposRacha.length >= P.nivel.subirTiposDistintos && e.evidencia >= P.nivel.subirEvidencia && e.nivel < 3) {
    e.nivel = (e.nivel + 1) as Nivel; e.racha = 0; e.tiposRacha = []; cambio = 'sube';
  } else if (otraExplicacion) {
    if (e.nivel > 1) { e.nivel = (e.nivel - 1) as Nivel; cambio = 'baja'; }
    e.fallosSeguidos = 0;
  }
  return { estado: e, cambio, otraExplicacion };
}

export type Situacion = 'nuevo' | 'aprendiendo' | 'dominado' | 'ayuda';

export function situacion(e: EstadoConcepto | undefined): Situacion {
  const D = PARAMETROS.dominio;
  if (!e || e.actividades === 0) return 'nuevo';
  if (e.caja >= D.cajaDominado && e.evidencia >= D.evidenciaDominado && e.nivel >= D.nivelDominado) return 'dominado';
  if (e.actividades >= D.intentosMinimosAyuda && e.evidencia < D.evidenciaAyuda) return 'ayuda';
  return 'aprendiendo';
}

export const tocaRepasar = (e: EstadoConcepto | undefined, ahora = Date.now()) => !!e && e.actividades > 0 && ahora >= e.proximo;

/** Avance visual 0-1 (para el camino del niño): combina repasos superados y calidad. Nunca baja de lo ya trabajado a cero. */
export function avance(e: EstadoConcepto | undefined): number {
  if (!e || e.actividades === 0) return 0;
  const D = PARAMETROS.dominio;
  return Math.min(1, 0.1 + 0.55 * Math.min(1, e.caja / D.cajaDominado) + 0.35 * Math.min(1, e.evidencia / D.evidenciaDominado));
}
