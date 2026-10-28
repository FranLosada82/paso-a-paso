import type { Pregunta, Respuesta } from '../types';

/** Minúsculas, espacios colapsados, sin puntuación final ni comillas. */
export function normalizar(texto: string, quitarAcentos: boolean): string {
  let t = texto.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
  t = t.replace(/^[¿¡"'«]+|[.?!"'»]+$/g, '').trim();
  if (quitarAcentos) {
    // Quita tildes y diéresis pero conserva la ñ.
    t = t.replace(/ñ/g, '\uE000').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\uE000/g, 'ñ');
  }
  return t;
}

export function esCorrecta(p: Pregunta, r: Respuesta): boolean {
  switch (p.tipo) {
    case 'eleccion':
      return r.tipo === 'eleccion' && r.indice === p.correcta;
    case 'vf':
      return r.tipo === 'vf' && r.valor === p.correcta;
    case 'escribir': {
      if (r.tipo !== 'escribir') return false;
      const sinAcentos = !p.exigeAcentos;
      const dada = normalizar(r.texto, sinAcentos);
      return dada.length > 0 && p.respuestas.some((a) => normalizar(a, sinAcentos) === dada);
    }
    case 'ordenar':
      return r.tipo === 'ordenar' && r.orden.length === p.elementos.length && r.orden.every((e, i) => e === p.elementos[i]);
    case 'relacionar': {
      if (r.tipo !== 'relacionar' || r.pares.length !== p.pares.length) return false;
      const esperado = new Map(p.pares);
      return r.pares.every(([a, b]) => esperado.get(a) === b);
    }
  }
}

/** Texto de la respuesta correcta para mostrar tras un fallo. */
export function solucionTexto(p: Pregunta): string {
  switch (p.tipo) {
    case 'eleccion': return p.opciones[p.correcta];
    case 'vf': return p.correcta ? 'Verdadero' : 'Falso';
    case 'escribir': return p.respuestas[0];
    case 'ordenar': return p.elementos.join(' → ');
    case 'relacionar': return p.pares.map(([a, b]) => `${a} = ${b}`).join(' · ');
  }
}
