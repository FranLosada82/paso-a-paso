import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ASIGNATURAS, meta } from '../content/asignaturas';
import { useEstado } from './useEstado';
import { ir, useRuta } from './ruta';
import { Practica, Cabecera } from './Practica';
import { Adulto, PaginaClase, PuertaAdulto } from './Adulto';
import type { Asignatura } from '../types';
import type { Estado } from '../storage/estado';
import { estadoTema, paginaDe } from '../logic/paginas';

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
  else if (ruta.pantalla === 'practica' && asig) pantalla = <Practica key={location.hash} asig={asig} temas={ruta.temas} pagina={estado.paginaActual[asig.id] ?? 0} estado={estado} actualizar={actualizar} />;
  else if (ruta.pantalla === 'adulto' || ruta.pantalla === 'temas') {
    pantalla = !adultoOk ? <PuertaAdulto onOk={() => setAdultoOk(true)} />
      : ruta.pantalla === 'temas' && asig ? <PaginaClase asig={asig} estado={estado} actualizar={actualizar} />
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

export const paginaClase = (estado: Estado, asig: Asignatura): number | undefined => estado.paginaActual[asig.id];

/** Temas con alguna pregunta ya trabajada en clase (completos o a medias). */
export function temasDisponibles(estado: Estado, asig: Asignatura): string[] {
  const pag = paginaClase(estado, asig);
  return asig.temas.filter((t) => estadoTema(t, pag).estado !== 'pendiente').map((t) => t.id);
}

/** % de las preguntas disponibles (hasta la página de clase) acertadas la última vez. */
export function dominio(estado: Estado, asig: Asignatura, temaIds: string[]): number {
  const pag = paginaClase(estado, asig);
  if (pag === undefined) return 0;
  const ps = asig.temas.filter((t) => temaIds.includes(t.id)).flatMap((t) => t.preguntas.filter((p) => paginaDe(p, t) <= pag));
  if (ps.length === 0) return 0;
  return Math.round((ps.filter((p) => estado.preguntas[p.id]?.ultimaCorrecta).length / ps.length) * 100);
}

function Inicio({ estado }: { estado: Estado }) {
  const ultima = ASIGNATURAS.find((a) => a.id === estado.ultimaAsignatura);
  const temasUltima = ultima ? temasDisponibles(estado, ultima) : [];
  return (
    <main className="pantalla inicio">
      <header className="saludo">
        <img className="logo" src="./logo.png" alt="" />
        <div><h1>CHENCHO REPASO</h1><p>¿Qué repasamos hoy?</p></div>
      </header>
      {ultima && temasUltima.length > 0 && (
        <button className="continuar" style={{ ['--acento' as string]: meta(ultima.id).color }}
          onClick={() => ir({ pantalla: 'practica', asig: ultima.id, temas: temasUltima })}>
          <span>▶ Continuar</span><small>{ultima.nombre}</small>
        </button>
      )}
      <nav className="rejilla" aria-label="Asignaturas">
        {ASIGNATURAS.map((a) => {
          const m = meta(a.id); const pag = paginaClase(estado, a); const disp = temasDisponibles(estado, a); const pct = dominio(estado, a, disp);
          return (
            <button key={a.id} className="asig" style={{ ['--acento' as string]: m.color, ['--claro' as string]: m.claro }} onClick={() => ir({ pantalla: 'asignatura', asig: a.id })}>
              <span className="emoji" aria-hidden>{m.emoji}</span>
              <span className="nombre">{a.nombre}</span>
              <span className="sub">{pag !== undefined ? `Vais por la pág. ${pag}` : 'Sin página marcada'}</span>
              {disp.length > 0 && <span className="mini-barra" aria-label={`Dominio ${pct}%`}><span style={{ width: `${pct}%` }} /></span>}
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
  const pag = paginaClase(estado, asig);
  const disp = temasDisponibles(estado, asig);
  return (
    <main className="pantalla" style={{ ['--acento' as string]: m.color, ['--claro' as string]: m.claro }}>
      <Cabecera titulo={`${m.emoji} ${asig.nombre}`} />
      {disp.length === 0 ? (
        <div className="tarjeta centro">
          <p className="grande">{pag === undefined ? 'Todavía no sabemos por qué página vais.' : `En la pág. ${pag} aún no hay preguntas.`}</p>
          <p>Pide a un adulto que marque la página del libro por la que vais en clase.</p>
          <button className="boton" onClick={() => ir({ pantalla: 'temas', asig: asig.id })}>Marcar página (adulto)</button>
        </div>
      ) : (
        <>
          <p className="pagina-chip">📖 Vais por la <b>página {pag}</b></p>
          <button className="boton ancho grande-boton" onClick={() => ir({ pantalla: 'practica', asig: asig.id, temas: disp })}>
            Repasar todo lo dado
          </button>
        </>
      )}
      <ol className="camino">
        {asig.temas.map((t, i) => {
          const { estado: et, disponibles } = estadoTema(t, pag); const dado = et !== 'pendiente'; const pct = dominio(estado, asig, [t.id]);
          return (
            <li key={t.id} className={`paso ${dado ? 'dado' : 'no-dado'} ${i % 2 ? 'der' : 'izq'}`}>
              <button disabled={!dado} onClick={() => ir({ pantalla: 'practica', asig: asig.id, temas: [t.id] })}
                aria-label={`Tema ${t.numero}: ${t.titulo}. ${et === 'pendiente' ? 'Aún no dado' : et === 'medias' ? `A medias, ${disponibles} preguntas. Dominio ${pct}%` : `Dominio ${pct}%`}`}>
                <span className="circulo" style={{ ['--pct' as string]: `${pct * 3.6}deg` }}><span>{dado ? (pct >= 80 && et === 'completo' ? '★' : t.numero) : '🔒'}</span></span>
                <span className="titulo-tema">{t.titulo}</span>
                {et === 'pendiente' && <span className="sub">Aún no dado</span>}
                {et === 'medias' && <span className="sub medias">A medias</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {disp.length > 0 && <button className="enlace" onClick={() => ir({ pantalla: 'temas', asig: asig.id })}>🔒 Cambiar página</button>}
    </main>
  );
}
