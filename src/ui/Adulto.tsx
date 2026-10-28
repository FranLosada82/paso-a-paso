import { useRef, useState } from 'react';
import { estadoTema, paginasLibro, rangoTema, temaDePagina, finDeTemaEn } from '../logic/paginas';
import { ASIGNATURAS, meta } from '../content/asignaturas';
import { estadoInicial, exportarCopia, importarCopia, type Estado } from '../storage/estado';
import type { Asignatura } from '../types';
import { Cabecera } from './Practica';
import { ir } from './ruta';
import { dominio, paginaClase, temasDisponibles } from './App';

type Act = (f: (e: Estado) => Estado) => void;

/** Pregunta sencilla para adultos; evita cambios accidentales del niño (no es seguridad). */
export function PuertaAdulto({ onOk }: { onOk: () => void }) {
  const [v, setV] = useState('');
  const [error, setError] = useState(false);
  return (
    <main className="pantalla"><Cabecera titulo="Zona de adultos" />
      <form className="tarjeta centro" onSubmit={(e) => { e.preventDefault(); if (Number(v.trim()) === 3) onOk(); else setError(true); }}>
        <label htmlFor="puerta" className="grande">¿Cuál es la raíz cúbica de 27?</label>
        <input id="puerta" className="escribir" inputMode="numeric" value={v} onChange={(e) => { setV(e.target.value); setError(false); }} autoFocus />
        {error && <p role="alert">No es correcto.</p>}
        <button className="boton" type="submit">Entrar</button>
      </form>
    </main>
  );
}

export function PaginaClase({ asig, estado, actualizar }: { asig: Asignatura; estado: Estado; actualizar: Act }) {
  const { min, max } = paginasLibro(asig);
  const actual = estado.paginaActual[asig.id];
  const [texto, setTexto] = useState(actual !== undefined ? String(actual) : '');
  const fijar = (n: number | undefined) => {
    setTexto(n === undefined ? '' : String(n));
    actualizar((e) => {
      const paginaActual = { ...e.paginaActual };
      if (n === undefined) delete paginaActual[asig.id]; else paginaActual[asig.id] = n;
      return { ...e, paginaActual };
    });
  };
  const cambiar = (v: string) => {
    setTexto(v);
    const n = parseInt(v, 10);
    if (Number.isInteger(n) && n >= 0 && n <= 2000) fijar(n);
  };
  const pag = actual;
  const total = pag === undefined ? 0 : asig.temas.reduce((k, t) => k + estadoTema(t, pag).disponibles, 0);
  const tema = pag === undefined ? undefined : temaDePagina(asig, pag);
  return (
    <main className="pantalla" style={{ ['--acento' as string]: meta(asig.id).color }}>
      <Cabecera titulo={`Página · ${asig.nombre}`} volver={{ pantalla: 'asignatura', asig: asig.id }} />
      <section className="tarjeta centro">
        <label htmlFor="pagina" className="grande">¿Por qué página del libro vais en clase?</label>
        <div className="selector-pagina">
          <button className="boton secundario" aria-label="Página anterior" onClick={() => fijar(Math.max(min, (pag ?? min) - 1))}>−</button>
          <input id="pagina" className="escribir" inputMode="numeric" value={texto} placeholder={`${min}-${max}`} onChange={(e) => cambiar(e.target.value)} />
          <button className="boton secundario" aria-label="Página siguiente" onClick={() => fijar(Math.min(max, (pag ?? min - 1) + 1))}>+</button>
        </div>
        <p className="nota">Libro: {asig.libro} · páginas {min}-{max}</p>
        {pag !== undefined && (
          <p role="status"><b>{total}</b> preguntas disponibles{tema && <> · vais por el tema {tema.numero}: «{tema.titulo}»</>}</p>
        )}
      </section>
      <ul className="lista-temas">
        {asig.temas.map((t) => {
          const r = rangoTema(t); const { estado: et, disponibles } = estadoTema(t, pag);
          return (
            <li key={t.id}>
              <span><b>{t.numero}. {t.titulo}</b> <small>· págs. {r.ini}-{r.fin}</small><br />
                <small>{et === 'completo' ? '✔ Completo' : et === 'medias' ? `◐ A medias: ${disponibles} de ${t.preguntas.length} preguntas` : 'Aún no'}</small></span>
              <button className="boton peq secundario" onClick={() => fijar(r.fin)}>Terminado</button>
            </li>
          );
        })}
      </ul>
      <div className="fila">
        <button className="boton secundario" onClick={() => fijar(undefined)}>Quitar página</button>
        <button className="boton" onClick={() => ir({ pantalla: 'asignatura', asig: asig.id })}>Listo</button>
      </div>
    </main>
  );
}

export function Adulto({ estado, actualizar, reemplazar }: { estado: Estado; actualizar: Act; reemplazar: (e: Estado) => void }) {
  const archivo = useRef<HTMLInputElement>(null);
  const [mensaje, setMensaje] = useState('');
  const total = ASIGNATURAS.reduce((n, a) => n + a.temas.reduce((k, t) => k + t.preguntas.length, 0), 0);

  const exportar = () => {
    const url = URL.createObjectURL(new Blob([exportarCopia(estado)], { type: 'application/json' }));
    const enl = document.createElement('a');
    enl.href = url; enl.download = `paso-a-paso-copia-${new Date().toISOString().slice(0, 10)}.json`;
    enl.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMensaje('Copia descargada. Guárdala en un lugar seguro.');
  };
  const importar = async (f: File) => {
    try {
      const nuevo = importarCopia(await f.text(), finDeTemaEn(ASIGNATURAS));
      if (confirm('Esto SUSTITUIRÁ todo el progreso y las páginas marcadas en este dispositivo por los de la copia. ¿Continuar?')) {
        reemplazar(nuevo); setMensaje('Copia restaurada correctamente.');
      }
    } catch (e) { setMensaje(`No se ha importado: ${(e as Error).message}`); }
    if (archivo.current) archivo.current.value = '';
  };

  return (
    <main className="pantalla">
      <Cabecera titulo="Zona de adultos" />
      <section className="tarjeta">
        <h2>Página por la que vais en clase</h2>
        <ul className="lista-asig">
          {ASIGNATURAS.map((a) => {
            const d = temasDisponibles(estado, a); const pag = paginaClase(estado, a); const s = estado.sesiones.filter((x) => x.asignatura === a.id);
            return (
              <li key={a.id}>
                <span>{meta(a.id).emoji} <b>{a.nombre}</b><br /><small>{pag !== undefined ? `pág. ${pag}` : 'sin página'} · dominio {dominio(estado, a, d)}% · {s.length} sesiones</small></span>
                <button className="boton peq" onClick={() => ir({ pantalla: 'temas', asig: a.id })}>Página</button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="tarjeta">
        <h2>Ajustes</h2>
        <label className="interruptor"><input type="checkbox" checked={estado.ajustes.textoGrande} onChange={(e) => actualizar((s) => ({ ...s, ajustes: { ...s.ajustes, textoGrande: e.target.checked } }))} /> Texto grande</label>
        <label className="interruptor"><input type="checkbox" checked={estado.ajustes.sonido} onChange={(e) => actualizar((s) => ({ ...s, ajustes: { ...s.ajustes, sonido: e.target.checked } }))} /> Sonido suave al responder</label>
      </section>
      <section className="tarjeta">
        <h2>Copia de seguridad</h2>
        <p className="nota">El progreso se guarda solo en este dispositivo. El navegador puede borrarlo (por ejemplo, al limpiar datos o en iPad si no se usa en semanas). Haz copias de vez en cuando.</p>
        <div className="fila">
          <button className="boton" onClick={exportar}>Descargar copia</button>
          <button className="boton secundario" onClick={() => archivo.current?.click()}>Restaurar copia…</button>
          <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </div>
        {mensaje && <p role="status" className="nota">{mensaje}</p>}
      </section>
      <section className="tarjeta">
        <h2>Reiniciar</h2>
        <div className="fila">
          <button className="boton peligro" onClick={() => confirm('¿Borrar las respuestas y sesiones? Las páginas marcadas se mantienen.') && actualizar((e) => ({ ...e, preguntas: {}, sesiones: [] }))}>Borrar progreso</button>
          <button className="boton peligro" onClick={() => confirm('¿Borrar TODO (progreso, páginas marcadas y ajustes)?') && reemplazar(estadoInicial())}>Borrar todo</button>
        </div>
      </section>
      <section className="tarjeta nota">
        <h2>Sobre el contenido</h2>
        <p>{total} preguntas originales organizadas según el índice de los libros de 2.º. Están inspiradas en sus temas, pero no son una copia del libro ni garantizan cubrir todo lo que se trabaja en clase. Si una pregunta no encaja, se puede corregir en el archivo de contenidos.</p>
        <p>Sin cuentas, sin anuncios, sin analítica. Funciona sin conexión.</p>
      </section>
    </main>
  );
}
