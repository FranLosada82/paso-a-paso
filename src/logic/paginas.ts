import type { Asignatura, Pregunta, Tema } from '../types';

export function rangoTema(t: Tema): { ini: number; fin: number } {
  const n = (t.paginas ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (n.length === 0) return { ini: 0, fin: 0 };
  return { ini: n[0], fin: n[n.length - 1] };
}

/** Sin página propia, la pregunta cuenta como del final del tema. */
export const paginaDe = (p: Pregunta, t: Tema) => p.pagina ?? rangoTema(t).fin;

export function paginasLibro(a: Asignatura): { min: number; max: number } {
  const r = a.temas.map(rangoTema);
  return { min: Math.min(...r.map((x) => x.ini)), max: Math.max(...r.map((x) => x.fin)) };
}

export type EstadoTema = 'pendiente' | 'medias' | 'completo';

export function estadoTema(t: Tema, pagina: number | undefined): { estado: EstadoTema; disponibles: number } {
  if (pagina === undefined) return { estado: 'pendiente', disponibles: 0 };
  const disponibles = t.preguntas.filter((p) => paginaDe(p, t) <= pagina).length;
  if (disponibles === 0) return { estado: 'pendiente', disponibles };
  return { estado: disponibles === t.preguntas.length || pagina >= rangoTema(t).fin ? 'completo' : 'medias', disponibles };
}

/** Tema en el que cae una página (o el siguiente si la página está entre temas). */
export function temaDePagina(a: Asignatura, pagina: number): Tema | undefined {
  return a.temas.find((t) => pagina <= rangoTema(t).fin) ?? a.temas[a.temas.length - 1];
}

export function finDeTemaEn(asignaturas: Asignatura[]) {
  const mapa = new Map(asignaturas.flatMap((a) => a.temas.map((t) => [t.id, rangoTema(t).fin] as const)));
  return (id: string) => mapa.get(id);
}
