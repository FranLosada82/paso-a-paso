export type Idioma = 'es' | 'en';

interface PreguntaBase {
  id: string;
  enunciado: string;
  explicacion: string;
  ayuda?: string;
  /** Página del libro donde se trabaja este contenido. */
  pagina?: number;
}
export interface PreguntaEleccion extends PreguntaBase { tipo: 'eleccion'; opciones: string[]; correcta: number }
export interface PreguntaVF extends PreguntaBase { tipo: 'vf'; correcta: boolean }
export interface PreguntaEscribir extends PreguntaBase { tipo: 'escribir'; respuestas: string[]; exigeAcentos?: boolean }
export interface PreguntaOrdenar extends PreguntaBase { tipo: 'ordenar'; elementos: string[] }
export interface PreguntaRelacionar extends PreguntaBase { tipo: 'relacionar'; pares: [string, string][] }

export type Pregunta = PreguntaEleccion | PreguntaVF | PreguntaEscribir | PreguntaOrdenar | PreguntaRelacionar;

export interface Tema {
  id: string;
  numero: number;
  titulo: string;
  paginas?: string;
  resumen?: string;
  explicacion: string;
  preguntas: Pregunta[];
}

export interface Asignatura {
  id: string;
  nombre: string;
  libro: string;
  idioma: Idioma;
  temas: Tema[];
}

/** Respuesta del niño según el tipo de pregunta. */
export type Respuesta =
  | { tipo: 'eleccion'; indice: number }
  | { tipo: 'vf'; valor: boolean }
  | { tipo: 'escribir'; texto: string }
  | { tipo: 'ordenar'; orden: string[] }
  | { tipo: 'relacionar'; pares: [string, string][] };
