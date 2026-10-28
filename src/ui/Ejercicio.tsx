import { useMemo, useState } from 'react';
import type { Pregunta, Respuesta } from '../types';
import { barajarDistinto, barajar } from '../logic/aleatorio';

interface Props { pregunta: Pregunta; bloqueado: boolean; onCambio: (r: Respuesta | null) => void }

/** Pinta la pregunta y devuelve la respuesta en curso (null si aún no está completa). */
export function Ejercicio({ pregunta, bloqueado, onCambio }: Props) {
  switch (pregunta.tipo) {
    case 'eleccion': return <Eleccion opciones={pregunta.opciones} bloqueado={bloqueado} onElegir={(i) => onCambio({ tipo: 'eleccion', indice: i })} />;
    case 'vf': return <Eleccion opciones={['Verdadero ✔', 'Falso ✘']} bloqueado={bloqueado} onElegir={(i) => onCambio({ tipo: 'vf', valor: i === 0 })} />;
    case 'escribir': return <Escribir bloqueado={bloqueado} onCambio={(t) => onCambio(t.trim() ? { tipo: 'escribir', texto: t } : null)} />;
    case 'ordenar': return <Ordenar key={pregunta.id} elementos={pregunta.elementos} bloqueado={bloqueado} onCambio={(o) => onCambio(o ? { tipo: 'ordenar', orden: o } : null)} />;
    case 'relacionar': return <Relacionar key={pregunta.id} pares={pregunta.pares} bloqueado={bloqueado} onCambio={(p) => onCambio(p ? { tipo: 'relacionar', pares: p } : null)} />;
  }
}

function Eleccion({ opciones, bloqueado, onElegir }: { opciones: string[]; bloqueado: boolean; onElegir: (i: number) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="opciones" role="radiogroup">
      {opciones.map((o, i) => (
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

function Ordenar({ elementos, bloqueado, onCambio }: { elementos: string[]; bloqueado: boolean; onCambio: (o: string[] | null) => void }) {
  const desordenados = useMemo(() => barajarDistinto(elementos), [elementos]);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const poner = (e: string) => { const n = [...elegidos, e]; setElegidos(n); onCambio(n.length === elementos.length ? n : null); };
  const quitar = (i: number) => { const n = elegidos.filter((_, k) => k !== i); setElegidos(n); onCambio(null); };
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

function Relacionar({ pares, bloqueado, onCambio }: { pares: [string, string][]; bloqueado: boolean; onCambio: (p: [string, string][] | null) => void }) {
  const izq = useMemo(() => barajar(pares.map((p) => p[0])), [pares]);
  const der = useMemo(() => barajarDistinto(pares.map((p) => p[1])), [pares]);
  const [hechos, setHechos] = useState<[string, string][]>([]);
  const [activa, setActiva] = useState<string | null>(null);
  const colores = ['c1', 'c2', 'c3', 'c4'];
  const idx = (a: string) => hechos.findIndex((h) => h[0] === a);
  const idxDer = (b: string) => hechos.findIndex((h) => h[1] === b);
  const actualizar = (n: [string, string][]) => { setHechos(n); onCambio(n.length === pares.length ? n : null); };
  const tocarIzq = (a: string) => {
    if (idx(a) >= 0) { actualizar(hechos.filter((h) => h[0] !== a)); setActiva(null); return; }
    setActiva(activa === a ? null : a);
  };
  const tocarDer = (b: string) => {
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
