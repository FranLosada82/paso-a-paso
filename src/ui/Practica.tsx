import { useMemo, useRef, useState } from 'react';
import type { Asignatura, Respuesta } from '../types';
import type { Estado } from '../storage/estado';
import { registrarRespuesta } from '../storage/estado';
import { crearSesion, type ItemSesion } from '../logic/sesion';
import { esCorrecta, solucionTexto } from '../logic/correccion';
import { Ejercicio } from './Ejercicio';
import { ir } from './ruta';
import { meta } from '../content/asignaturas';
import { pitido } from './sonido';

const ANIMO_OK = ['¡Muy bien!', '¡Genial!', '¡Correcto!', '¡Lo has clavado!', '¡Estupendo!'];
const ANIMO_KO = ['¡Casi! Mira esto:', 'Buen intento. Fíjate:', 'No pasa nada, así se aprende:'];
const al = (l: string[]) => l[Math.floor(Math.random() * l.length)];

interface Props { asig: Asignatura; temas: string[]; estado: Estado; actualizar: (f: (e: Estado) => Estado) => void }

export function Practica(props: Props) {
  const [ronda, setRonda] = useState(0);
  return <Sesion key={ronda} {...props} otraRonda={() => setRonda((r) => r + 1)} />;
}

function Sesion({ asig, temas, estado, actualizar, otraRonda }: Props & { otraRonda: () => void }) {
  const m = meta(asig.id);
  // La sesión se fija al empezar (no cambia mientras se responde).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inicial = useMemo(() => crearSesion(asig, temas, estado.preguntas), []);
  const [cola, setCola] = useState<ItemSesion[]>(inicial);
  const [pos, setPos] = useState(0);
  const [resp, setResp] = useState<Respuesta | null>(null);
  const [resultado, setResultado] = useState<null | boolean>(null);
  const [aciertosPrimera, setAciertosPrimera] = useState(0);
  const [verExplic, setVerExplic] = useState(false);
  const falladas = useRef(new Set<string>());
  const [clave, setClave] = useState(0);

  if (inicial.length === 0) {
    return (
      <main className="pantalla"><Cabecera titulo={asig.nombre} />
        <div className="tarjeta"><p>No hay preguntas para estos temas todavía.</p>
          <button className="boton" onClick={() => ir({ pantalla: 'asignatura', asig: asig.id })}>Volver</button></div>
      </main>
    );
  }

  const total = inicial.length;
  if (pos >= cola.length) {
    const estrellas = aciertosPrimera === total ? 3 : aciertosPrimera >= total * 0.7 ? 2 : 1;
    return (
      <main className="pantalla final" style={{ ['--acento' as string]: m.color }}>
        <div className="tarjeta centro">
          <div className="estrellas" aria-label={`${estrellas} estrellas`}>{'★'.repeat(estrellas)}<span className="apagada">{'★'.repeat(3 - estrellas)}</span></div>
          <h1>¡Sesión terminada!</h1>
          <p className="grande">Has acertado <strong>{aciertosPrimera}</strong> de <strong>{total}</strong> a la primera.</p>
          <p>{falladas.current.size > 0 ? 'Y has repasado las que costaron. ¡Así se aprende!' : '¡Todas a la primera, qué crack!'}</p>
          <div className="fila">
            <button className="boton" onClick={otraRonda}>Otra ronda</button>
            <button className="boton secundario" onClick={() => ir({ pantalla: 'asignatura', asig: asig.id })}>Volver a temas</button>
          </div>
        </div>
      </main>
    );
  }

  const item = cola[pos];
  const p = item.pregunta;
  const tema = asig.temas.find((t) => t.id === item.temaId)!;

  const comprobar = () => {
    if (!resp) return;
    const ok = esCorrecta(p, resp);
    setResultado(ok);
    pitido(ok, estado.ajustes.sonido);
    const primeraVez = !falladas.current.has(p.id);
    if (primeraVez) {
      actualizar((e) => {
        let n = registrarRespuesta(e, p.id, ok);
        if (pos === cola.length - 1 && ok) n = cerrarSesion(n, aciertosPrimera + 1);
        return n;
      });
      if (ok) setAciertosPrimera((a) => a + 1);
    } else if (ok && pos === cola.length - 1) {
      actualizar((e) => cerrarSesion(e, aciertosPrimera));
    }
    if (!ok) {
      if (primeraVez) { falladas.current.add(p.id); setCola((c) => [...c, item]); }
      else if (pos === cola.length - 1) actualizar((e) => cerrarSesion(e, aciertosPrimera));
    }
  };
  const cerrarSesion = (e: Estado, aciertos: number): Estado => ({
    ...e, ultimaAsignatura: asig.id,
    sesiones: [...e.sesiones, { fecha: Date.now(), asignatura: asig.id, temas, aciertos, total }].slice(-500),
  });
  const siguiente = () => { setPos(pos + 1); setResp(null); setResultado(null); setVerExplic(false); setClave((k) => k + 1); };

  const progreso = Math.min(1, pos / cola.length);
  return (
    <main className="pantalla practica" style={{ ['--acento' as string]: m.color, ['--claro' as string]: m.claro }}>
      <div className="barra-sup">
        <button className="cerrar" aria-label="Salir de la práctica" onClick={() => ir({ pantalla: 'asignatura', asig: asig.id })}>✕</button>
        <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={cola.length} aria-valuenow={pos}><div style={{ width: `${progreso * 100}%` }} /></div>
      </div>
      <p className="tema-chip">{m.emoji} Tema {tema.numero}: {tema.titulo}{falladas.current.has(p.id) && resultado === null ? ' · otra vez' : ''}</p>
      <section className="pregunta" aria-live="polite">
        <h1 className="enunciado" lang={asig.idioma}>{p.enunciado}</h1>
        {p.ayuda && <p className="ayuda" lang="es">🇪🇸 {p.ayuda}</p>}
        <button className="enlace" onClick={() => setVerExplic(!verExplic)} aria-expanded={verExplic}>💡 {verExplic ? 'Ocultar' : 'Recordar'} la explicación del tema</button>
        {verExplic && <p className="explic-tema">{tema.explicacion}</p>}
        <Ejercicio key={clave} pregunta={p} bloqueado={resultado !== null} onCambio={setResp} />
      </section>
      <div className={`pie ${resultado === null ? '' : resultado ? 'ok' : 'ko'}`} role="status">
        {resultado === null ? (
          <button className="boton ancho" disabled={!resp} onClick={comprobar}>Comprobar</button>
        ) : (
          <>
            <div className="feedback">
              <strong>{resultado ? al(ANIMO_OK) : al(ANIMO_KO)}</strong>
              {!resultado && <p>Respuesta: <b>{solucionTexto(p)}</b></p>}
              <p>{p.explicacion}</p>
              {!resultado && <p className="nota">La volverás a ver al final.</p>}
            </div>
            <button className="boton ancho" autoFocus onClick={siguiente}>Continuar</button>
          </>
        )}
      </div>
    </main>
  );
}

export function Cabecera({ titulo, volver = { pantalla: 'inicio' } }: { titulo: string; volver?: Parameters<typeof ir>[0] }) {
  return (
    <header className="cabecera">
      <button className="atras" aria-label="Volver" onClick={() => ir(volver)}>←</button>
      <h1>{titulo}</h1>
    </header>
  );
}
