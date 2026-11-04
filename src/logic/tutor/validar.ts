import type { Concepto, Pregunta, Tema } from '../../types';
import { normalizar } from '../correccion';

const palabras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const n = (t: string) => normalizar(t, true);
/** Solo espacios: mayúsculas y signos pueden ser justo lo que se evalúa (Lengua, Inglés). */
const igual = (t: string) => t.trim().replace(/\s+/g, ' ');
/** ¿Aparece `respuesta` como palabra o expresión completa dentro de `texto`? */
const contiene = (texto: string, respuesta: string) => {
  const r = n(respuesta);
  if (r.length < 2) return false;
  return ` ${n(texto).replace(/[^\p{L}\p{N}]+/gu, ' ')} `.includes(` ${r.replace(/[^\p{L}\p{N}]+/gu, ' ')} `);
};

/** Respuestas que no deben aparecer en las pistas (la pista ayuda a pensar, no da la solución). */
function respuestasDe(p: Pregunta): string[] {
  switch (p.tipo) {
    case 'eleccion': return [p.opciones[p.correcta]];
    case 'escribir': return p.respuestas;
    default: return [];
  }
}

/**
 * Problemas que impiden mostrar una pregunta al niño (se excluye en tiempo de ejecución y los tests los señalan).
 * Cubre ambigüedad detectable automáticamente; la corrección del contenido la revisa un adulto.
 */
export function problemasPregunta(p: Pregunta): string[] {
  const e: string[] = [];
  if (!p.enunciado.trim()) e.push('enunciado vacío');
  if (!p.explicacion.trim()) e.push('sin explicación');
  if (p.nivel !== undefined && ![1, 2, 3].includes(p.nivel)) e.push(`nivel ${p.nivel} no válido`);
  switch (p.tipo) {
    case 'eleccion': {
      if (p.opciones.length < 2 || p.opciones.length > 4) e.push('debe tener 2-4 opciones');
      if (!(p.correcta >= 0 && p.correcta < p.opciones.length)) e.push('correcta fuera de rango');
      if (new Set(p.opciones.map(igual)).size !== p.opciones.length) e.push('opciones repetidas (ambigua)');
      if (p.opciones.some((o) => !o.trim())) e.push('opción vacía');
      break;
    }
    case 'escribir':
      if (!p.respuestas.length || p.respuestas.some((r) => !r.trim())) e.push('sin respuestas aceptadas');
      break;
    case 'ordenar':
      if (p.elementos.length < 3 || new Set(p.elementos.map(igual)).size !== p.elementos.length) e.push('elementos repetidos o insuficientes');
      break;
    case 'relacionar':
      if (p.pares.length < 3 || new Set(p.pares.map((x) => igual(x[0]))).size !== p.pares.length || new Set(p.pares.map((x) => igual(x[1]))).size !== p.pares.length)
        e.push('parejas repetidas o insuficientes (ambigua)');
      break;
    case 'vf': break;
  }
  for (const pista of p.pistas ?? []) {
    if (respuestasDe(p).some((r) => contiene(pista, r))) e.push(`la pista «${pista}» contiene la respuesta`);
  }
  return e;
}

/** Problemas de un concepto escrito (para la validación del contenido). */
export function problemasConcepto(c: Concepto, t: Tema): string[] {
  const e: string[] = [];
  if (!c.id.startsWith(`${t.id}-c`)) e.push(`id ${c.id} debe empezar por ${t.id}-c`);
  const w = palabras(c.descubre);
  if (w < 15 || w > 60) e.push(`descubre tiene ${w} palabras (15-60)`);
  if (!c.objetivo.trim() || !c.nombre.trim()) e.push('falta nombre u objetivo');
  if (c.otraManera.length < 2) e.push('necesita al menos 2 explicaciones de otra manera');
  if (new Set(c.otraManera.map((o) => o.estilo)).size !== c.otraManera.length) e.push('estilos de otra manera repetidos');
  const ps = t.preguntas.filter((p) => p.concepto === c.id && !p.revisar);
  if (ps.length < 3) e.push(`solo ${ps.length} preguntas (mín. 3)`);
  if (new Set(ps.map((p) => p.tipo)).size < 2) e.push('preguntas de un solo tipo');
  return e;
}
