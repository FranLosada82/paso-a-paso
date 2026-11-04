import { useMemo, useRef, useState } from 'react';
import type { Asignatura, Idioma, Respuesta } from '../types';
import type { Estado } from '../storage/estado';
import { registrarActividad, registrarRespuesta } from '../storage/estado';
import { esCorrecta, solucionTexto } from '../logic/correccion';
import { actividadSimilar, crearPlan, type Modo, type Paso } from '../logic/tutor/planificador';
import type { ConceptoTutor } from '../logic/tutor/modelo';
import type { Cambio } from '../logic/tutor/dominio';
import { MENSAJES, TITULO_FASE, mensaje, sinFelicitacion } from '../logic/tutor/mensajes';
import { PARAMETROS } from '../logic/tutor/parametros';
import { Ejercicio } from './Ejercicio';
import { ir } from './ruta';
import { meta } from '../content/asignaturas';
import { pitido } from './sonido';
import { callar, hablar, hayVoz } from './voz';

type Act = (f: (e: Estado) => Estado) => void;
interface Props { asig: Asignatura; temas: string[]; modo: Modo; pagina: number; estado: Estado; actualizar: Act }

type Refuerzo = 'parecida' | 'misma' | null;
const ESTILO: Record<string, string> = { ejemplo: 'Con un ejemplo', pasos: 'Paso a paso', visual: 'Con dibujos', comparar: 'Comparando' };

export function Practica(props: Props) {
  const [ronda, setRonda] = useState(0);
  return <Sesion key={ronda} {...props} otraRonda={() => setRonda((r) => r + 1)} />;
}

/** Botón para escuchar un texto (solo si el adulto lo tiene activado y el dispositivo tiene voz). */
export function Escuchar({ texto, idioma, activo }: { texto: string; idioma: Idioma; activo: boolean }) {
  if (!activo || !hayVoz()) return null;
  return <button className="escuchar" aria-label="Escuchar" onClick={() => hablar(texto, idioma)}>🔊</button>;
}

interface Resumen { conceptos: Set<string>; suben: Set<string>; retoOk: boolean; corregidos: number; aciertosPrimera: number; actividades: number }

function Sesion({ asig, temas, modo, pagina, estado, actualizar, otraRonda }: Props & { otraRonda: () => void }) {
  const m = meta(asig.id);
  const voz = estado.ajustes.voz;
  const aprender = modo === 'aprender';
  // La sesión se planifica al empezar con el estado de ese momento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inicial = useMemo(() => crearPlan(modo, asig, temas, pagina, estado, { duracion: estado.ajustes.duracion }), []);
  const [plan, setPlan] = useState<Paso[]>(inicial);
  const [pos, setPos] = useState(0);
  const [resp, setResp] = useState<Respuesta | null>(null);
  /** responder → (fallo) reintentar → resuelto */
  const [etapa, setEtapa] = useState<'responder' | 'reintentar' | 'resuelto'>('responder');
  const [ok, setOk] = useState(false);
  const [pistas, setPistas] = useState(0);
  const [otra, setOtra] = useState<number | null>(null);
  const [otraUsada, setOtraUsada] = useState(false);
  const [descartadas, setDescartadas] = useState<number[]>([]);
  const [aviso, setAviso] = useState<{ titulo: string; cambio: Cambio; refuerzo: Refuerzo }>({ titulo: '', cambio: null, refuerzo: null });
  const [clave, setClave] = useState(0);
  const resumen = useRef<Resumen>({ conceptos: new Set(), suben: new Set(), retoOk: false, corregidos: 0, aciertosPrimera: 0, actividades: 0 });
  const refuerzos = useRef(0);
  const sesionGuardada = useRef(false);
  const usadas = useRef(new Set(inicial.flatMap((p) => (p.clase === 'actividad' ? [p.actividad.pregunta.id] : []))));

  const salir = () => { callar(); ir({ pantalla: 'asignatura', asig: asig.id }); };

  if (inicial.length === 0) {
    return (
      <main className="pantalla"><Cabecera titulo={asig.nombre} />
        <div className="tarjeta"><p>No hay actividades para estos temas todavía.</p>
          <button className="boton" onClick={salir}>Volver</button></div>
      </main>
    );
  }

  if (pos >= plan.length) return <Final asig={asig} modo={modo} r={resumen.current} otraRonda={otraRonda} salir={salir} />;

  const paso = plan[pos];
  const progreso = Math.min(1, pos / plan.length);
  /** Registra la sesión una sola vez, en cuanto se responde la última actividad (sin esperar a «Continuar»). */
  const registrarSesion = (pl: Paso[]) => {
    if (sesionGuardada.current) return;
    sesionGuardada.current = true;
    const r = resumen.current;
    const ids = [...new Set(pl.flatMap((x) => (x.clase === 'actividad' ? [x.concepto.id] : [])))];
    actualizar((e) => ({
      ...e, ultimaAsignatura: asig.id,
      sesiones: [...e.sesiones, { fecha: Date.now(), asignatura: asig.id, temas, aciertos: r.aciertosPrimera, total: r.actividades, modo, conceptos: ids }].slice(-500),
    }));
  };
  const siguiente = () => {
    callar();
    if (pos + 1 >= plan.length) registrarSesion(plan);
    setPos(pos + 1); setResp(null); setEtapa('responder'); setOk(false); setPistas(0); setOtra(null); setOtraUsada(false); setDescartadas([]);
    setAviso({ titulo: '', cambio: null, refuerzo: null }); setClave((k) => k + 1);
  };
  const barra = (
    <div className="barra-sup">
      <button className="cerrar" aria-label="Salir" onClick={salir}>✕</button>
      <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={plan.length} aria-valuenow={pos}><div style={{ width: `${progreso * 100}%` }} /></div>
    </div>
  );
  const estilo = { ['--acento' as string]: m.color, ['--claro' as string]: m.claro };

  if (paso.clase === 'descubrir') {
    return (
      <main className="pantalla practica" style={estilo}>
        {barra}
        <TarjetaConcepto c={paso.concepto} idioma={asig.idioma} voz={voz} alternativa={!!paso.alternativa} />
        <div className="pie"><button className="boton ancho" autoFocus onClick={siguiente}>{paso.alternativa ? '¡Ahora lo pruebo!' : '¡Vamos a practicar!'}</button></div>
      </main>
    );
  }

  const { actividad: a, concepto: c, fase } = paso;
  const p = a.pregunta;
  // Las pistas se ofrecen desde el principio al aprender; al repasar, solo después de un fallo.
  // Sin la pista de quitar una opción si esa opción ya se ve descartada (nivel inicial).
  const listaPistas = a.pistas.filter((x) => !(x.ayuda?.tipo === 'quitar-opcion' && paso.ocultas.includes(x.ayuda.indice)));
  const pistasVisibles = listaPistas.slice(0, pistas);
  const ayudaEjercicio = pistasVisibles.map((x) => x.ayuda).filter((x) => !!x);
  const ocultas = [...new Set([...paso.ocultas, ...descartadas, ...ayudaEjercicio.flatMap((x) => (x.tipo === 'quitar-opcion' ? [x.indice] : []))])];
  const primeroPuesto = ayudaEjercicio.some((x) => x.tipo === 'primer-elemento' || x.tipo === 'una-pareja');
  const puedePista = pistas < listaPistas.length && etapa !== 'resuelto' && (aprender || etapa === 'reintentar');
  const mostrarOtraBoton = c.otraManera.length > 0 && etapa !== 'resuelto' && (aprender || etapa === 'reintentar');

  const verPista = () => { setPistas((k) => k + 1); setClave((k) => k + 1); setResp(null); };
  const verOtra = () => { setOtraUsada(true); setOtra((i) => (i === null ? 0 : (i + 1) % c.otraManera.length)); };

  const terminar = (correcta: boolean, intentos: number) => {
    const r = resumen.current;
    r.actividades++; r.conceptos.add(c.nombre);
    if (correcta && intentos === 1) r.aciertosPrimera++;
    if (correcta && intentos > 1) r.corregidos++;
    if (fase === 'reto' && correcta) r.retoOk = true;
    const resultado = { tipo: p.tipo, correcta, intentos, pistas, otraManera: otraUsada };
    const aplicar = (e: Estado) => registrarActividad(registrarRespuesta(e, p.id, correcta && intentos === 1), c.id, resultado);
    // El estado de la pantalla es el último guardado: sirve para saber ya si sube de nivel o necesita otra explicación.
    const { cambio, otraExplicacion } = aplicar(estado);
    actualizar((e) => aplicar(e).estado);
    if (cambio === 'sube') r.suben.add(c.nombre);
    const nuevos: { en: number; paso: Paso }[] = [];
    // Errores repetidos en el concepto: antes de seguir, se explica de otra manera.
    if (otraExplicacion && aprender && c.otraManera.length) nuevos.push({ en: pos + 1, paso: { clase: 'descubrir', fase: 'descubrir', concepto: c, alternativa: true } });
    // Después de dos fallos: una actividad parecida (no idéntica) un poco más adelante.
    let refuerzo: Refuerzo = null;
    if (!correcta && !paso.refuerzo && refuerzos.current < PARAMETROS.maxRefuerzosPorSesion) {
      const similar = actividadSimilar(c, a, pagina, usadas.current, estado);
      if (similar) usadas.current.add(similar.pregunta.id);
      nuevos.push({ en: pos + 3, paso: similar ? { clase: 'actividad', fase, actividad: similar, concepto: c, ocultas: [], refuerzo: 'parecida' } : { ...paso, refuerzo: 'misma' } });
      refuerzos.current++;
      refuerzo = similar ? 'parecida' : 'misma';
    }
    if (nuevos.length) setPlan((pl) => { const n = [...pl]; for (const x of [...nuevos].reverse()) n.splice(Math.min(n.length, x.en), 0, x.paso); return n; });
    else if (pos === plan.length - 1) registrarSesion(plan);
    return { cambio, refuerzo };
  };

  const comprobar = () => {
    if (!resp) return;
    const bien = esCorrecta(p, resp);
    pitido(bien, estado.ajustes.sonido);
    if (bien) {
      setOk(true); setEtapa('resuelto');
      setAviso({ titulo: mensaje(etapa === 'reintentar' ? MENSAJES.aciertoReintento : MENSAJES.acierto), ...terminar(true, etapa === 'reintentar' ? 2 : 1) });
    } else if (etapa === 'responder') {
      // Primer fallo: ánimo, una pista y otra oportunidad.
      setEtapa('reintentar');
      setAviso({ titulo: mensaje(MENSAJES.primerFallo), cambio: null, refuerzo: null });
      if (resp.tipo === 'eleccion' && p.tipo === 'eleccion' && p.opciones.length - ocultas.length > 2) setDescartadas((d) => [...d, resp.indice]);
      if (pistas < listaPistas.length) setPistas((k) => k + 1);
      setResp(null); setClave((k) => k + 1);
    } else {
      // Segundo fallo: otra explicación, la solución y el porqué.
      setOk(false); setEtapa('resuelto');
      if (c.otraManera.length && otra === null) setOtra(0);
      setAviso({ titulo: mensaje(MENSAJES.segundoFallo), ...terminar(false, 2) });
    }
  };

  const titulo = fase === 'recordar' || fase === 'repasar' ? TITULO_FASE[fase] : `${TITULO_FASE[fase]} · ${c.nombre}`;
  return (
    <main className={`pantalla practica fase-${fase}`} style={estilo}>
      {barra}
      <p className="tema-chip"><span className="fase">{titulo}</span> · Tema {a.tema.numero}{paso.refuerzo === 'parecida' ? ' · otra parecida' : paso.refuerzo === 'misma' ? ' · otra vez' : ''}</p>
      <section className="pregunta" aria-live="polite">
        <div className="enunciado-fila">
          <h1 className="enunciado" lang={asig.idioma}>{p.enunciado}</h1>
          <Escuchar texto={p.enunciado} idioma={asig.idioma} activo={voz} />
        </div>
        {p.ayuda && <p className="ayuda" lang="es">🇪🇸 {p.ayuda}</p>}
        {pistasVisibles.length > 0 && etapa !== 'resuelto' && (
          <ul className="pistas" aria-label="Pistas">{pistasVisibles.map((x, i) => <li key={i}>💡 {x.texto}</li>)}</ul>
        )}
        {otra !== null && c.otraManera[otra] && (
          <div className="otra-manera">
            <p className="nota"><b>{ESTILO[c.otraManera[otra].estilo] ?? 'De otra manera'}</b></p>
            <p className="texto-otra">{c.otraManera[otra].texto}</p>
            <Escuchar texto={c.otraManera[otra].texto} idioma="es" activo={voz} />
          </div>
        )}
        <Ejercicio key={clave} pregunta={p} bloqueado={etapa === 'resuelto'} onCambio={setResp} ocultas={ocultas} primeroPuesto={primeroPuesto} />
        {etapa !== 'resuelto' && (puedePista || mostrarOtraBoton) && (
          <div className="ayudas">
            {puedePista && <button className="boton peq secundario" onClick={verPista}>💡 Pista</button>}
            {mostrarOtraBoton && <button className="boton peq secundario" onClick={verOtra}>🤔 Explícamelo de otra manera</button>}
          </div>
        )}
      </section>
      <div className={`pie ${etapa === 'resuelto' ? (ok ? 'ok' : 'ko') : etapa === 'reintentar' ? 'intento' : ''}`} role="status">
        {etapa !== 'resuelto' ? (
          <>
            {etapa === 'reintentar' && <div className="feedback"><strong>{aviso.titulo}</strong></div>}
            <button className="boton ancho" disabled={!resp} onClick={comprobar}>{etapa === 'reintentar' ? 'Comprobar otra vez' : 'Comprobar'}</button>
          </>
        ) : (
          <>
            <div className="feedback">
              <strong>{aviso.titulo}</strong>
              {!ok && <p>Respuesta: <b>{solucionTexto(p)}</b></p>}
              <p>{ok ? p.explicacion : sinFelicitacion(p.explicacion)}</p>
              {aviso.cambio === 'sube' && <p className="nota">🌟 {MENSAJES.sube}</p>}
              {aviso.refuerzo && <p className="nota">{aviso.refuerzo === 'parecida' ? MENSAJES.refuerzo : MENSAJES.refuerzoMisma}</p>}
            </div>
            <button className="boton ancho" autoFocus onClick={siguiente}>Continuar</button>
          </>
        )}
      </div>
    </main>
  );
}

function TarjetaConcepto({ c, idioma, voz, alternativa }: { c: ConceptoTutor; idioma: Idioma; voz: boolean; alternativa: boolean }) {
  const [i, setI] = useState(alternativa ? 0 : -1);
  const texto = i < 0 ? c.descubre : c.otraManera[i].texto;
  const idiomaTexto: Idioma = i < 0 ? idioma : 'es';
  return (
    <section className="tarjeta descubre" aria-live="polite">
      <p className="tema-chip"><span className="fase">{alternativa ? 'Vamos a verlo de otra manera' : 'Descubre'}</span></p>
      <h1>{c.nombre}</h1>
      <div className="enunciado-fila">
        <p className="texto-descubre" lang={idiomaTexto}>{texto}</p>
        <Escuchar texto={texto} idioma={idiomaTexto} activo={voz} />
      </div>
      {i < 0 && c.ayuda && <p className="ayuda" lang="es">🇪🇸 {c.ayuda}</p>}
      {i >= 0 && <p className="nota">{ESTILO[c.otraManera[i].estilo]}</p>}
      {c.otraManera.length > 0 && (
        <button className="boton peq secundario" onClick={() => setI((k) => (k + 1 >= c.otraManera.length ? -1 : k + 1))}>
          {i + 1 >= c.otraManera.length ? '↩ Volver a la explicación' : '🤔 Explícamelo de otra manera'}
        </button>
      )}
    </section>
  );
}

function Final({ asig, modo, r, otraRonda, salir }: { asig: Asignatura; modo: Modo; r: Resumen; otraRonda: () => void; salir: () => void }) {
  const m = meta(asig.id);
  // Las estrellas premian el esfuerzo y aprender de los errores, no el porcentaje de aciertos.
  const logros = [
    { ok: true, texto: modo === 'aprender' ? 'Misión completada' : 'Repaso completado' },
    { ok: modo === 'aprender' ? r.retoOk : r.actividades > 0 && r.aciertosPrimera > 0, texto: modo === 'aprender' ? 'Reto superado' : 'Te acuerdas de lo aprendido' },
    { ok: r.corregidos > 0 || r.aciertosPrimera === r.actividades, texto: r.corregidos > 0 ? 'Has aprendido de un error' : 'Todo pensado con calma' },
  ];
  const estrellas = logros.filter((l) => l.ok).length;
  return (
    <main className="pantalla final" style={{ ['--acento' as string]: m.color }}>
      <div className="tarjeta centro">
        <div className="estrellas" aria-label={`${estrellas} estrellas`}>{'★'.repeat(estrellas)}<span className="apagada">{'★'.repeat(3 - estrellas)}</span></div>
        <h1>{modo === 'aprender' ? '¡Misión cumplida!' : '¡Repaso terminado!'}</h1>
        <ul className="logros">{logros.filter((l) => l.ok).map((l) => <li key={l.texto}>★ {l.texto}</li>)}</ul>
        {r.conceptos.size > 0 && <p>Hoy has trabajado: <b>{[...r.conceptos].join(', ')}</b>.</p>}
        {r.suben.size > 0 && <p>🌟 Ya estás preparado para retos más difíciles en: <b>{[...r.suben].join(', ')}</b>.</p>}
        <div className="fila">
          <button className="boton" onClick={otraRonda}>{modo === 'aprender' ? 'Seguir aprendiendo' : 'Otro repaso'}</button>
          <button className="boton secundario" onClick={salir}>Volver a temas</button>
        </div>
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
