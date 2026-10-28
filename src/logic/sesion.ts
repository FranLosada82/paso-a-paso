import type { Asignatura, Pregunta } from '../types';
import type { EstadoPregunta } from '../storage/estado';
import { barajar } from './aleatorio';

export const PREGUNTAS_POR_SESION = 10;

export interface ItemSesion { pregunta: Pregunta; temaId: string }

/**
 * Elige preguntas de los temas indicados. Prioridad: falladas la última vez,
 * después nunca vistas, después el resto (las más antiguas primero).
 */
export function crearSesion(
  asig: Asignatura,
  temaIds: string[],
  historial: Record<string, EstadoPregunta>,
  n = PREGUNTAS_POR_SESION,
  rnd: () => number = Math.random,
): ItemSesion[] {
  const items: ItemSesion[] = asig.temas
    .filter((t) => temaIds.includes(t.id))
    .flatMap((t) => t.preguntas.map((pregunta) => ({ pregunta, temaId: t.id })));
  const peso = (it: ItemSesion) => {
    const h = historial[it.pregunta.id];
    if (!h) return 1;
    if (!h.ultimaCorrecta) return 0;
    return 2;
  };
  const mezcladas = barajar(items, rnd);
  mezcladas.sort((a, b) => peso(a) - peso(b) || (historial[a.pregunta.id]?.ultima ?? 0) - (historial[b.pregunta.id]?.ultima ?? 0));
  return barajar(mezcladas.slice(0, n), rnd);
}
