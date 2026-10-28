import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ASIGNATURAS, meta } from '../content/asignaturas';
import { useEstado } from './useEstado';
import { ir, useRuta } from './ruta';
import { Practica, Cabecera } from './Practica';
import { Adulto, TemasDados, PuertaAdulto } from './Adulto';
import type { Asignatura } from '../types';
import type { Estado } from '../storage/estado';

export function App() {
  const ruta = useRuta();
  const { estado, actualizar, reemplazar, errorGuardado } = useEstado();
  const { needRefresh: [hayNueva], updateServiceWorker } = useRegisterSW();
  const [adultoOk, setAdultoOk] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('texto-grande', !!estado?.ajustes.textoGrande);
  }, [estado?.ajustes.textoGrande]);

  if (!estado) return <main className="pantalla"><p className="cargando">Cargando…</p></main>;

  const asig = 'asig' in ruta ? ASIGNATURAS.find((a) => a.id === ruta.asig) : undefined;
  let pantalla;
  if (ruta.pantalla === 'asignatura' && asig) pantalla = <PantallaAsignatura asig={asig} estado={estado} />;
  else if (ruta.pantalla === 'practica' && asig) pantalla = <Practica key={location.hash} asig={asig} temas={ruta.temas} estado={estado} actualizar={actualizar} />;
  else if (ruta.pantalla === 'adulto' || ruta.pantalla === 'temas') {
    pantalla = !adultoOk ? <PuertaAdulto onOk={() => setAdultoOk(true)} />
      : ruta.pantalla === 'temas' && asig ? <TemasDados asig={asig} estado={estado} actualizar={actualizar} />
      : <Adulto estado={estado} actualizar={actualizar} reemplazar={reemplazar} />;
  } else pantalla = <Inicio estado={estado} />;

  return (
    <>
      {hayNueva && (
        <div className="aviso" role="alert">
          Hay una versión nueva de la app. Tu progreso se conserva.
          <button className="boton peq" onClick={() => updateServiceWorker(true)}>Actualizar</button>
        </div>
      )}
      {errorGuardado && <div className="aviso error" role="alert">No se pudo guardar el progreso en este dispositivo.</div>}
      {pantalla}
    </>
  );
}

export function temasDadosDe(estado: Estado, asig: Asignatura): string[] {
  const dados = estado.temasDados[asig.id] ?? [];
  return asig.temas.filter((t) => dados.includes(t.id)).map((t) => t.id);
}

/** % de preguntas de los temas dados que se han acertado la última vez. */
export function dominio(estado: Estado, asig: Asignatura, temaIds: string[]): number {
  const ps = asig.temas.filter((t) => temaIds.includes(t.id)).flatMap((t) => t.preguntas);
  if (ps.length === 0) return 0;
  return Math.round((ps.filter((p) => estado.preguntas[p.id]?.ultimaCorrecta).length / ps.length) * 100);
}

function Inicio({ estado }: { estado: Estado }) {
  const ultima = ASIGNATURAS.find((a) => a.id === estado.ultimaAsignatura);
  const temasUltima = ultima ? temasDadosDe(estado, ultima) : [];
  return (
    <main className="pantalla inicio">
      <header className="saludo">
        <div className="logo" aria-hidden>👣</div>
        <div><h1>Paso a Paso</h1><p>¿Qué repasamos hoy?</p></div>
      </header>
      {ultima && temasUltima.length > 0 && (
        <button className="continuar" style={{ ['--acento' as string]: meta(ultima.id).color }}
          onClick={() => ir({ pantalla: 'practica', asig: ultima.id, temas: temasUltima })}>
          <span>▶ Continuar</span><small>{ultima.nombre}</small>
        </button>
      )}
      <nav className="rejilla" aria-label="Asignaturas">
        {ASIGNATURAS.map((a) => {
          const m = meta(a.id); const dados = temasDadosDe(estado, a); const pct = dominio(estado, a, dados);
          return (
            <button key={a.id} className="asig" style={{ ['--acento' as string]: m.color, ['--claro' as string]: m.claro }} onClick={() => ir({ pantalla: 'asignatura', asig: a.id })}>
              <span className="emoji" aria-hidden>{m.emoji}</span>
              <span className="nombre">{a.nombre}</span>
              <span className="sub">{dados.length ? `${dados.length} de ${a.temas.length} temas dados` : 'Sin temas marcados'}</span>
              {dados.length > 0 && <span className="mini-barra" aria-label={`Dominio ${pct}%`}><span style={{ width: `${pct}%` }} /></span>}
            </button>
          );
        })}
      </nav>
      <button className="enlace adultos" onClick={() => ir({ pantalla: 'adulto' })}>🔒 Zona de adultos</button>
    </main>
  );
}

function PantallaAsignatura({ asig, estado }: { asig: Asignatura; estado: Estado }) {
  const m = meta(asig.id);
  const dados = temasDadosDe(estado, asig);
  return (
    <main className="pantalla" style={{ ['--acento' as string]: m.color, ['--claro' as string]: m.claro }}>
      <Cabecera titulo={`${m.emoji} ${asig.nombre}`} />
      {dados.length === 0 ? (
        <div className="tarjeta centro">
          <p className="grande">Todavía no hay temas marcados.</p>
          <p>Pide a un adulto que marque los temas que ya habéis dado en clase.</p>
          <button className="boton" onClick={() => ir({ pantalla: 'temas', asig: asig.id })}>Marcar temas (adulto)</button>
        </div>
      ) : (
        <button className="boton ancho grande-boton" onClick={() => ir({ pantalla: 'practica', asig: asig.id, temas: dados })}>
          Repasar todo lo dado ({dados.length} {dados.length === 1 ? 'tema' : 'temas'})
        </button>
      )}
      <ol className="camino">
        {asig.temas.map((t, i) => {
          const dado = dados.includes(t.id); const pct = dominio(estado, asig, [t.id]);
          return (
            <li key={t.id} className={`paso ${dado ? 'dado' : 'no-dado'} ${i % 2 ? 'der' : 'izq'}`}>
              <button disabled={!dado} onClick={() => ir({ pantalla: 'practica', asig: asig.id, temas: [t.id] })}
                aria-label={`Tema ${t.numero}: ${t.titulo}. ${dado ? `Dominio ${pct}%` : 'Aún no dado'}`}>
                <span className="circulo" style={{ ['--pct' as string]: `${pct * 3.6}deg` }}><span>{dado ? (pct >= 80 ? '★' : t.numero) : '🔒'}</span></span>
                <span className="titulo-tema">{t.titulo}</span>
                {!dado && <span className="sub">Aún no dado</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {dados.length > 0 && <button className="enlace" onClick={() => ir({ pantalla: 'temas', asig: asig.id })}>🔒 Cambiar temas dados</button>}
    </main>
  );
}
