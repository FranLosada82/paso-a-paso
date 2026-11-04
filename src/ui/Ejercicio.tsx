import { useMemo, useState } from 'react';
import type { Pregunta, Respuesta } from '../types';
import { azarDe, barajarDistinto, barajar } from '../logic/aleatorio';

interface Props {
  pregunta: Pregunta; bloqueado: boolean; onCambio: (r: Respuesta | null) => void;
  /** Opciones descartadas (nivel inicial, pista o intento anterior): se ven tachadas y no se pueden elegir. */
  ocultas?: number[];
  /** Ordenar: el primero ya colocado. Relacionar: una pareja ya unida. */
  primeroPuesto?: boolean;
}

/** Pinta la pregunta y devuelve la respuesta en curso (null si aún no está completa). */
export function Ejercicio({ pregunta, bloqueado, onCambio, ocultas = [], primeroPuesto = false }: Props) {
  switch (pregunta.tipo) {
    case 'eleccion': return <Eleccion id={pregunta.id} opciones={pregunta.opciones} ocultas={ocultas} bloqueado={bloqueado} onElegir={(i) => onCambio({ tipo: 'eleccion', indice: i })} />;
    case 'vf': return <Eleccion opciones={['Verdadero ✔', 'Falso ✘']} ocultas={[]} bloqueado={bloqueado} onElegir={(i) => onCambio({ tipo: 'vf', valor: i === 0 })} />;
    case 'escribir': return <Escribir bloqueado={bloqueado} onCambio={(t) => onCambio(t.trim() ? { tipo: 'escribir', texto: t } : null)} />;
    case 'ordenar': return <Ordenar key={pregunta.id} elementos={pregunta.elementos} fijo={primeroPuesto ? 1 : 0} bloqueado={bloqueado} onCambio={(o) => onCambio(o ? { tipo: 'ordenar', orden: o } : null)} />;
    case 'relacionar': return <Relacionar key={pregunta.id} pares={pregunta.pares} fijo={primeroPuesto} bloqueado={bloqueado} onCambio={(p) => onCambio(p ? { tipo: 'relacionar', pares: p } : null)} />;
  }
}

function Eleccion({ id, opciones, ocultas, bloqueado, onElegir }: { id?: string; opciones: string[]; ocultas: number[]; bloqueado: boolean; onElegir: (i: number) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  // En el contenido la correcta suele ser la primera: se barajan (verdadero/falso, sin id, mantiene su orden).
  const orden = useMemo(() => (id ? barajar(opciones.map((_, i) => i), azarDe(id)) : opciones.map((_, i) => i)), [id, opciones]);
  return (
    <div className="opciones" role="radiogroup">
      {orden.map((i) => [opciones[i], i] as const).map(([o, i]) => ocultas.includes(i) ? (
        <button key={i} role="radio" aria-checked={false} className="opcion descartada" disabled aria-label={`${o} (descartada)`}>{o}</button>
      ) : (
        <button key={i} role="radio" aria-checked={sel === i} className={`opcion ${sel === i ? 'elegida' : ''}`} disabled={bloqueado}
          onClick={() => { setSel(i); onElegir(i); }}>{o}</button>
      ))}
    </div>
  );
}

function Escribir({ bloqueado, onCambio }: { bloqueado: boolean; onCambio: (t: string) => void }) {
  return (
    <input className="escribir" type="text" aria-label="Escribe tu respuesta" placeholder="Escribe aquí…" autoComplete="off" autoCorrect="off"
      autoCapitalize="off" spellCheck={false} disabled={bloqueado} autoFocus onChange={(e) => onCambio(e.target.value)} />
  );
}

function Ordenar({ elementos, fijo, bloqueado, onCambio }: { elementos: string[]; fijo: number; bloqueado: boolean; onCambio: (o: string[] | null) => void }) {
  const desordenados = useMemo(() => barajarDistinto(elementos), [elementos]);
  const [elegidos, setElegidos] = useState<string[]>(() => elementos.slice(0, fijo));
  const poner = (e: string) => { const n = [...elegidos, e]; setElegidos(n); onCambio(n.length === elementos.length ? n : null); };
  const quitar = (i: number) => { if (i < fijo) return; const n = elegidos.filter((_, k) => k !== i); setElegidos(n); onCambio(null); };
  return (
    <div className="ordenar">
      <p className="indicacion">Toca en orden. Toca uno de arriba para quitarlo.</p>
      <ol className="ranura" aria-label="Tu orden">
        {elegidos.length === 0 && <li className="vacio">…</li>}
        {elegidos.map((e, i) => <li key={e}><button className="ficha puesta" disabled={bloqueado} onClick={() => quitar(i)}>{i + 1}. {e}</button></li>)}
      </ol>
      <div className="fichas">
        {desordenados.map((e) => (
          <button key={e} className="ficha" disabled={bloqueado || elegidos.includes(e)} onClick={() => poner(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}

function Relacionar({ pares, fijo, bloqueado, onCambio }: { pares: [string, string][]; fijo: boolean; bloqueado: boolean; onCambio: (p: [string, string][] | null) => void }) {
  const izq = useMemo(() => barajar(pares.map((p) => p[0])), [pares]);
  const der = useMemo(() => barajarDistinto(pares.map((p) => p[1])), [pares]);
  const [hechos, setHechos] = useState<[string, string][]>(() => (fijo ? [pares[0]] : []));
  const bloqueadaIzq = (a: string) => fijo && a === pares[0][0];
  const bloqueadaDer = (b: string) => fijo && b === pares[0][1];
  const [activa, setActiva] = useState<string | null>(null);
  const colores = ['c1', 'c2', 'c3', 'c4'];
  const idx = (a: string) => hechos.findIndex((h) => h[0] === a);
  const idxDer = (b: string) => hechos.findIndex((h) => h[1] === b);
  const actualizar = (n: [string, string][]) => { setHechos(n); onCambio(n.length === pares.length ? n : null); };
  const tocarIzq = (a: string) => {
    if (bloqueadaIzq(a)) return;
    if (idx(a) >= 0) { actualizar(hechos.filter((h) => h[0] !== a)); setActiva(null); return; }
    setActiva(activa === a ? null : a);
  };
  const tocarDer = (b: string) => {
    if (bloqueadaDer(b)) return;
    if (!activa) { if (idxDer(b) >= 0) actualizar(hechos.filter((h) => h[1] !== b)); return; }
    actualizar([...hechos.filter((h) => h[1] !== b), [activa, b]]);
    setActiva(null);
  };
  return (
    <div>
      <p className="indicacion">Toca uno de la izquierda y después su pareja de la derecha.</p>
      <div className="relacionar">
        <div className="columna">
          {izq.map((a) => (
            <button key={a} className={`ficha ${activa === a ? 'activa' : ''} ${idx(a) >= 0 ? colores[idx(a)] : ''}`} aria-pressed={activa === a} disabled={bloqueado} onClick={() => tocarIzq(a)}>{a}</button>
          ))}
        </div>
        <div className="columna">
          {der.map((b) => (
            <button key={b} className={`ficha ${idxDer(b) >= 0 ? colores[idxDer(b)] : ''}`} disabled={bloqueado} onClick={() => tocarDer(b)}>{b}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
