import { DURACIONES, type Duracion } from '../logic/tutor/parametros';
import { actualizarConcepto, type Cambio, type EstadoConcepto, type ResultadoActividad } from '../logic/tutor/dominio';
import type { Nivel } from '../types';

export const VERSION_ESQUEMA = 3;
export const TAMANO_MAX_COPIA = 5 * 1024 * 1024;

export interface EstadoPregunta { aciertos: number; fallos: number; ultimaCorrecta: boolean; ultima: number }
export interface RegistroSesion {
  fecha: number; asignatura: string; temas: string[]; aciertos: number; total: number;
  modo?: 'aprender' | 'repasar'; conceptos?: string[];
}
export interface Ajustes {
  textoGrande: boolean; sonido: boolean;
  /** Botones para escuchar en voz alta (voz del dispositivo, sin conexión). */
  voz: boolean;
  duracion: Duracion;
}

export interface Estado {
  version: number;
  /** Página del libro por la que va la clase, por asignatura. */
  paginaActual: Record<string, number>;
  preguntas: Record<string, EstadoPregunta>;
  /** Dominio por concepto (motor adaptativo y repasos espaciados). */
  conceptos: Record<string, EstadoConcepto>;
  sesiones: RegistroSesion[];
  ajustes: Ajustes;
  ultimaAsignatura?: string;
}

export function estadoInicial(): Estado {
  return { version: VERSION_ESQUEMA, paginaActual: {}, preguntas: {}, conceptos: {}, sesiones: [], ajustes: { textoGrande: false, sonido: false, voz: true, duracion: 'normal' } };
}

const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Para migrar la versión 1 (temas marcados): última página de cada tema. */
export type FinDeTema = (temaId: string) => number | undefined;

/** Convierte datos antiguos o importados al esquema actual. Lanza Error si no son válidos. */
export function migrarYValidar(datos: unknown, finDeTema: FinDeTema = () => undefined): Estado {
  if (!esObj(datos)) throw new Error('El archivo no contiene datos de la app.');
  const v = datos.version;
  if (typeof v !== 'number' || v < 1) throw new Error('Falta la versión del esquema.');
  if (v > VERSION_ESQUEMA) throw new Error('La copia es de una versión más nueva de la app. Actualiza la app primero.');
  const e = estadoInicial();
  if (!esObj(datos.preguntas) || !Array.isArray(datos.sesiones)) throw new Error('Faltan secciones obligatorias.');
  if (v === 1) {
    // v1 guardaba temas marcados: se pasa a la última página del último tema marcado.
    if (!esObj(datos.temasDados)) throw new Error('Faltan secciones obligatorias.');
    for (const [k, lista] of Object.entries(datos.temasDados)) {
      if (!Array.isArray(lista)) throw new Error(`Temas no válidos en «${k}».`);
      const fines = lista.map((t) => finDeTema(String(t))).filter((n): n is number => typeof n === 'number');
      if (fines.length) e.paginaActual[k] = Math.max(...fines);
    }
  } else {
    if (!esObj(datos.paginaActual)) throw new Error('Faltan secciones obligatorias.');
    for (const [k, n] of Object.entries(datos.paginaActual)) {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 2000) throw new Error(`Página no válida en «${k}».`);
      e.paginaActual[k] = n;
    }
  }
  for (const [k, p] of Object.entries(datos.preguntas)) {
    if (!esObj(p) || typeof p.aciertos !== 'number' || typeof p.fallos !== 'number' || typeof p.ultimaCorrecta !== 'boolean' || typeof p.ultima !== 'number')
      throw new Error(`Registro de pregunta no válido: ${k}`);
    e.preguntas[k] = { aciertos: p.aciertos, fallos: p.fallos, ultimaCorrecta: p.ultimaCorrecta, ultima: p.ultima };
  }
  for (const s of datos.sesiones) {
    if (!esObj(s) || typeof s.fecha !== 'number' || typeof s.asignatura !== 'string' || !Array.isArray(s.temas) || typeof s.aciertos !== 'number' || typeof s.total !== 'number')
      throw new Error('Registro de sesión no válido.');
    const r: RegistroSesion = { fecha: s.fecha, asignatura: s.asignatura, temas: s.temas.map(String), aciertos: s.aciertos, total: s.total };
    if (s.modo === 'aprender' || s.modo === 'repasar') r.modo = s.modo;
    if (Array.isArray(s.conceptos)) r.conceptos = s.conceptos.map(String);
    e.sesiones.push(r);
  }
  // v1 y v2 no tenían conceptos: el tutor empieza a medirlos desde cero (el historial por pregunta se conserva).
  if (v >= 3) {
    if (!esObj(datos.conceptos)) throw new Error('Faltan secciones obligatorias.');
    for (const [k, c] of Object.entries(datos.conceptos)) e.conceptos[k] = validarConcepto(k, c);
  }
  if (esObj(datos.ajustes)) {
    const a = datos.ajustes;
    e.ajustes = {
      textoGrande: !!a.textoGrande, sonido: !!a.sonido,
      voz: typeof a.voz === 'boolean' ? a.voz : true,
      duracion: DURACIONES.includes(a.duracion as Duracion) ? (a.duracion as Duracion) : 'normal',
    };
  }
  if (typeof datos.ultimaAsignatura === 'string') e.ultimaAsignatura = datos.ultimaAsignatura;
  return e;
}

const NUMEROS: (keyof EstadoConcepto)[] = ['evidencia', 'caja', 'racha', 'fallosSeguidos', 'actividades', 'aciertos', 'fallos', 'pistas', 'otraManera', 'ultima', 'proximo'];

function validarConcepto(k: string, c: unknown): EstadoConcepto {
  if (!esObj(c) || ![1, 2, 3].includes(c.nivel as number) || !Array.isArray(c.tiposRacha) || NUMEROS.some((n) => typeof c[n] !== 'number' || !Number.isFinite(c[n])))
    throw new Error(`Registro de concepto no válido: ${k}`);
  const r = Object.fromEntries(NUMEROS.map((n) => [n, c[n] as number])) as unknown as EstadoConcepto;
  return { ...r, nivel: c.nivel as Nivel, tiposRacha: c.tiposRacha.map(String) as EstadoConcepto['tiposRacha'], evidencia: Math.max(0, Math.min(1, r.evidencia)) };
}

export function registrarRespuesta(e: Estado, preguntaId: string, correcta: boolean, ahora = Date.now()): Estado {
  const prev = e.preguntas[preguntaId] ?? { aciertos: 0, fallos: 0, ultimaCorrecta: false, ultima: 0 };
  return {
    ...e,
    preguntas: {
      ...e.preguntas,
      [preguntaId]: { aciertos: prev.aciertos + (correcta ? 1 : 0), fallos: prev.fallos + (correcta ? 0 : 1), ultimaCorrecta: correcta, ultima: ahora },
    },
  };
}

/** Registra una actividad terminada en el dominio de su concepto. */
export function registrarActividad(e: Estado, conceptoId: string, r: ResultadoActividad, ahora = Date.now()):
  { estado: Estado; cambio: Cambio; otraExplicacion: boolean } {
  const { estado, cambio, otraExplicacion } = actualizarConcepto(e.conceptos[conceptoId], r, ahora);
  return { estado: { ...e, conceptos: { ...e.conceptos, [conceptoId]: estado } }, cambio, otraExplicacion };
}

export function exportarCopia(e: Estado): string {
  return JSON.stringify({ app: 'paso-a-paso', exportado: new Date().toISOString(), ...e }, null, 2);
}

export function importarCopia(texto: string, finDeTema?: FinDeTema): Estado {
  if (texto.length > TAMANO_MAX_COPIA) throw new Error('El archivo es demasiado grande (máx. 5 MB).');
  let datos: unknown;
  try { datos = JSON.parse(texto); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!esObj(datos) || datos.app !== 'paso-a-paso') throw new Error('Este archivo no es una copia de CHENCHO REPASO.');
  return migrarYValidar(datos, finDeTema);
}
