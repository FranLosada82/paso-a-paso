import { useEffect, useState } from 'react';

export type Ruta =
  | { pantalla: 'inicio' }
  | { pantalla: 'asignatura'; asig: string }
  | { pantalla: 'practica'; asig: string; temas: string[] }
  | { pantalla: 'adulto' }
  | { pantalla: 'temas'; asig: string };

export function leerRuta(hash = location.hash): Ruta {
  const [, a, b, c] = hash.replace(/^#\/?/, '/').split('/');
  if (a === 'asignatura' && b) return { pantalla: 'asignatura', asig: b };
  if (a === 'practica' && b) return { pantalla: 'practica', asig: b, temas: c ? c.split(',') : [] };
  if (a === 'adulto') return b ? { pantalla: 'temas', asig: b } : { pantalla: 'adulto' };
  return { pantalla: 'inicio' };
}

export function ir(r: Ruta) {
  const h =
    r.pantalla === 'asignatura' ? `#/asignatura/${r.asig}` :
    r.pantalla === 'practica' ? `#/practica/${r.asig}/${r.temas.join(',')}` :
    r.pantalla === 'adulto' ? '#/adulto' :
    r.pantalla === 'temas' ? `#/adulto/${r.asig}` : '#/';
  location.hash = h;
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    const f = () => { setRuta(leerRuta()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return ruta;
}
