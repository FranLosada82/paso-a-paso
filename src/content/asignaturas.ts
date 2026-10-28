import type { Asignatura } from '../types';

export interface MetaAsignatura { id: string; corto: string; emoji: string; color: string; claro: string }

/** Orden y aspecto de las asignaturas. El contenido está en <id>.json. */
export const META: MetaAsignatura[] = [
  { id: 'mates', corto: 'Mates', emoji: '🔢', color: '#2E7DD7', claro: '#E3F0FF' },
  { id: 'lengua', corto: 'Lengua', emoji: '📖', color: '#D9534F', claro: '#FFE8E6' },
  { id: 'naturales', corto: 'Naturales', emoji: '🌱', color: '#2E9E6B', claro: '#E2F6EC' },
  { id: 'sociales', corto: 'Sociales', emoji: '🏘️', color: '#C77A12', claro: '#FFF1DC' },
  { id: 'science', corto: 'Science', emoji: '🔬', color: '#7A4FD0', claro: '#EFE8FF' },
  { id: 'ingles', corto: 'English', emoji: '💬', color: '#0F8C9C', claro: '#DFF6F8' },
  { id: 'musica', corto: 'Música', emoji: '🎵', color: '#C2407E', claro: '#FCE6F1' },
];

const ficheros = import.meta.glob<Asignatura>('./*.json', { eager: true, import: 'default' });

export const ASIGNATURAS: Asignatura[] = META.map((m) => ficheros[`./${m.id}.json`]).filter((a): a is Asignatura => !!a);

export const meta = (id: string): MetaAsignatura => META.find((m) => m.id === id) ?? META[0];
