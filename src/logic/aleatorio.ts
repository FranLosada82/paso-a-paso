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
