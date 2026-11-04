export type Idioma = 'es' | 'en';

/** 1 = inicial (concreto, pocas opciones), 2 = intermedio (comprensión y aplicación), 3 = avanzado (situaciones, combinar). */
export type Nivel = 1 | 2 | 3;

interface PreguntaBase {
  id: string;
  enunciado: string;
  explicacion: string;
  ayuda?: string;
  /** Página del libro donde se trabaja este contenido. */
  pagina?: number;
  /** Id del concepto del tema que trabaja (si falta, cuenta como del concepto general del tema). */
  concepto?: string;
  /** Nivel de dificultad; si falta se estima por el tipo de pregunta. */
  nivel?: Nivel;
  /** Pistas progresivas (de menos a más ayuda). Nunca deben contener la respuesta. */
  pistas?: string[];
  /** Contenido dudoso (OCR incompleto, sin verificar con el libro): no se muestra al niño. */
  revisar?: boolean;
}
export interface PreguntaEleccion extends PreguntaBase { tipo: 'eleccion'; opciones: string[]; correcta: number }
export interface PreguntaVF extends PreguntaBase { tipo: 'vf'; correcta: boolean }
export interface PreguntaEscribir extends PreguntaBase { tipo: 'escribir'; respuestas: string[]; exigeAcentos?: boolean }
export interface PreguntaOrdenar extends PreguntaBase { tipo: 'ordenar'; elementos: string[] }
export interface PreguntaRelacionar extends PreguntaBase { tipo: 'relacionar'; pares: [string, string][] }

export type Pregunta = PreguntaEleccion | PreguntaVF | PreguntaEscribir | PreguntaOrdenar | PreguntaRelacionar;
export type TipoPregunta = Pregunta['tipo'];

export type EstiloExplicacion = 'ejemplo' | 'pasos' | 'visual' | 'comparar';

/** Una idea principal del tema: se presenta antes de preguntar y se sigue por separado. */
export interface Concepto {
  id: string;
  nombre: string;
  /** Qué debe lograr el niño (para el adulto). */
  objetivo: string;
  /** Presentación para el niño, 20-50 palabras, una sola idea. */
  descubre: string;
  /** Traducción o apoyo en español (asignaturas en inglés). */
  ayuda?: string;
  /** «Explícamelo de otra manera»: otras formas de explicar lo mismo, sin dar la respuesta de ninguna pregunta. */
  otraManera: { estilo: EstiloExplicacion; texto: string }[];
  /** Página del libro donde empieza (el concepto no se presenta antes). */
  pagina?: number;
}

export interface Tema {
  id: string;
  numero: number;
  titulo: string;
  paginas?: string;
  resumen?: string;
  explicacion: string;
  conceptos?: Concepto[];
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
