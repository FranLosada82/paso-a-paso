export const VERSION_ESQUEMA = 1;
export const TAMANO_MAX_COPIA = 5 * 1024 * 1024;

export interface EstadoPregunta { aciertos: number; fallos: number; ultimaCorrecta: boolean; ultima: number }
export interface RegistroSesion { fecha: number; asignatura: string; temas: string[]; aciertos: number; total: number }
export interface Ajustes { textoGrande: boolean; sonido: boolean }

export interface Estado {
  version: number;
  /** Temas que el adulto ha marcado como ya dados en clase, por asignatura. */
  temasDados: Record<string, string[]>;
  preguntas: Record<string, EstadoPregunta>;
  sesiones: RegistroSesion[];
  ajustes: Ajustes;
  ultimaAsignatura?: string;
}

export function estadoInicial(): Estado {
  return { version: VERSION_ESQUEMA, temasDados: {}, preguntas: {}, sesiones: [], ajustes: { textoGrande: false, sonido: false } };
}

const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Convierte datos antiguos o importados al esquema actual. Lanza Error si no son válidos. */
export function migrarYValidar(datos: unknown): Estado {
  if (!esObj(datos)) throw new Error('El archivo no contiene datos de la app.');
  const v = datos.version;
  if (typeof v !== 'number' || v < 1) throw new Error('Falta la versión del esquema.');
  if (v > VERSION_ESQUEMA) throw new Error('La copia es de una versión más nueva de la app. Actualiza la app primero.');
  // (Las migraciones futuras irán aquí: if (v === 1) {...}.)
  const e = estadoInicial();
  if (!esObj(datos.temasDados) || !esObj(datos.preguntas) || !Array.isArray(datos.sesiones)) throw new Error('Faltan secciones obligatorias.');
  for (const [k, lista] of Object.entries(datos.temasDados)) {
    if (!Array.isArray(lista) || !lista.every((x) => typeof x === 'string')) throw new Error(`Temas no válidos en «${k}».`);
    e.temasDados[k] = [...new Set(lista as string[])];
  }
  for (const [k, p] of Object.entries(datos.preguntas)) {
    if (!esObj(p) || typeof p.aciertos !== 'number' || typeof p.fallos !== 'number' || typeof p.ultimaCorrecta !== 'boolean' || typeof p.ultima !== 'number')
      throw new Error(`Registro de pregunta no válido: ${k}`);
    e.preguntas[k] = { aciertos: p.aciertos, fallos: p.fallos, ultimaCorrecta: p.ultimaCorrecta, ultima: p.ultima };
  }
  for (const s of datos.sesiones) {
    if (!esObj(s) || typeof s.fecha !== 'number' || typeof s.asignatura !== 'string' || !Array.isArray(s.temas) || typeof s.aciertos !== 'number' || typeof s.total !== 'number')
      throw new Error('Registro de sesión no válido.');
    e.sesiones.push({ fecha: s.fecha, asignatura: s.asignatura, temas: s.temas.map(String), aciertos: s.aciertos, total: s.total });
  }
  if (esObj(datos.ajustes)) e.ajustes = { textoGrande: !!datos.ajustes.textoGrande, sonido: !!datos.ajustes.sonido };
  if (typeof datos.ultimaAsignatura === 'string') e.ultimaAsignatura = datos.ultimaAsignatura;
  return e;
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

export function exportarCopia(e: Estado): string {
  return JSON.stringify({ app: 'paso-a-paso', exportado: new Date().toISOString(), ...e }, null, 2);
}

export function importarCopia(texto: string): Estado {
  if (texto.length > TAMANO_MAX_COPIA) throw new Error('El archivo es demasiado grande (máx. 5 MB).');
  let datos: unknown;
  try { datos = JSON.parse(texto); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!esObj(datos) || datos.app !== 'paso-a-paso') throw new Error('Este archivo no es una copia de REPASO.');
  return migrarYValidar(datos);
}
