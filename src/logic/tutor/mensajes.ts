import type { Fase } from './planificador';

/** Mensajes sobrios y variados: reconocen el esfuerzo sin exagerar, nunca avergüenzan ni comparan. */
export const MENSAJES = {
  acierto: ['¡Bien hecho!', '¡Eso es!', 'Correcto.', '¡Bien pensado!', '¡Así es!', 'Muy bien.'],
  aciertoReintento: ['¡Ahora sí! Pensarlo otra vez ha funcionado.', '¡Eso es! Has encontrado el fallo.', 'Correcto. Volver a mirarlo ha servido.'],
  primerFallo: ['¡Casi! Vamos a pensarlo otra vez.', 'Buen intento. Te doy una pista:', 'Todavía no, pero vas por buen camino.', 'Mmm, casi. Fíjate en esto:'],
  segundoFallo: ['No pasa nada, así se aprende. Mira:', 'Vamos a verlo de otra manera:', 'Es normal que cueste al principio. Fíjate:'],
  refuerzo: 'Dentro de poco probarás con una parecida.',
  refuerzoMisma: 'Dentro de poco la volverás a ver.',
  sube: '¡Estás aprendiendo mucho! Ahora vienen retos un poco más difíciles.',
  baja: 'Vamos a practicarlo con calma, paso a paso.',
} as const;

export const TITULO_FASE: Record<Fase, string> = {
  recordar: '¿Te acuerdas?',
  descubrir: 'Descubre',
  practicar: 'Practicamos',
  aplicar: 'Piensa y aplica',
  reto: '¡Reto final!',
  repasar: 'Repaso',
};

const ultimos = new Map<readonly string[], number>();

/** Elige un mensaje distinto del anterior de la misma lista. */
export function mensaje(lista: readonly string[], rnd: () => number = Math.random): string {
  const prev = ultimos.get(lista);
  let i = Math.floor(rnd() * lista.length);
  if (lista.length > 1 && i === prev) i = (i + 1) % lista.length;
  ultimos.set(lista, i);
  return lista[i];
}

/** Quita la felicitación inicial de una explicación («¡Bien! …») para no mostrarla cuando el niño ha fallado. */
export function sinFelicitacion(texto: string): string {
  return texto
    .replace(/^\s*(¡\s*(muy bien|bien|bien hecho|eso es|exacto|correcto|genial|perfecto|estupendo|muy bien pensado|lo has clavado|sí|claro)\s*!|(well done|yes|great|good job|good|correct|that's right|excellent|right)\s*[!.])\s*/i, '')
    .replace(/^./, (c) => c.toUpperCase());
}
