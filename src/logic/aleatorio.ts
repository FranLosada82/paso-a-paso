export function barajar<T>(lista: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Baraja garantizando que no queda en el orden original (si hay más de 1 elemento). */
export function barajarDistinto<T>(lista: readonly T[], rnd: () => number = Math.random): T[] {
  if (lista.length < 2) return [...lista];
  for (let k = 0; k < 20; k++) {
    const b = barajar(lista, rnd);
    if (b.some((x, i) => x !== lista[i])) return b;
  }
  return [...lista.slice(1), lista[0]];
}

const semillaSesion = Math.floor(Math.random() * 2 ** 31);

/** Generador reproducible a partir de un texto (mismo orden para la misma pregunta mientras la app está abierta). */
export function azarDe(texto: string, semilla = semillaSesion): () => number {
  let h = semilla >>> 0;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
