/**
 * Parámetros pedagógicos del tutor (edad, dificultad, repasos y sesiones), en un solo sitio para poder revisarlos.
 * Ninguno depende del tiempo de respuesta: la velocidad nunca penaliza.
 */
export const PARAMETROS = {
  edad: 7,
  curso: '2.º de Primaria',

  nivel: {
    /** Aciertos seguidos a la primera y sin pistas, en el nivel actual, para subir de nivel. */
    subirTrasAciertos: 3,
    /** Además, tipos de actividad distintos acertados en ese nivel (que no suba por un solo formato). */
    subirTiposDistintos: 2,
    /** Evidencia mínima (0-1) para subir. */
    subirEvidencia: 0.7,
    /** Fallos seguidos (tras el reintento) en el mismo concepto que bajan un nivel y activan otra explicación. */
    bajarTrasFallos: 2,
  },

  /** Puntuación de cada respuesta para la evidencia de dominio (media móvil). */
  evidencia: {
    alfa: 0.35,
    primeraSinPistas: 1,
    primeraConPistas: 0.7,
    /** Acertada en el segundo intento. */
    reintento: 0.4,
    fallada: 0,
    /** Resta por cada pista o «Explícamelo de otra manera» usados. */
    porAyuda: 0.1,
  },

  /** Repetición espaciada por cajas (Leitner): días hasta el siguiente repaso de un concepto según su caja. */
  repaso: {
    diasPorCaja: [0, 1, 3, 7, 14, 30],
    /** Cajas que se pierden al fallar un concepto. */
    bajarCajasAlFallar: 2,
  },

  dominio: {
    /** Concepto dominado: caja mínima, evidencia mínima y nivel mínimo. */
    cajaDominado: 3,
    evidenciaDominado: 0.8,
    nivelDominado: 2,
    /** Necesita ayuda: evidencia baja tras un mínimo de intentos. */
    evidenciaAyuda: 0.45,
    intentosMinimosAyuda: 3,
    /** Para pasar al concepto siguiente (el anterior vuelve en los repasos): evidencia y nivel mínimos. */
    avanzarEvidencia: 0.7,
    avanzarNivel: 2,
  },

  /** Sesiones: número orientativo de actividades por fase según la duración elegida por el adulto. */
  sesion: {
    corta: { minutos: 10, recordar: 1, practicar: 3, aplicar: 2, reto: 1, repasar: 7 },
    normal: { minutos: 12, recordar: 2, practicar: 3, aplicar: 3, reto: 1, repasar: 10 },
    larga: { minutos: 15, recordar: 2, practicar: 4, aplicar: 4, reto: 2, repasar: 13 },
  },

  /** Como máximo, actividades seguidas del mismo tipo (para que no se vuelva mecánico). */
  maxMismoTipoSeguidas: 2,
  /** Actividades de refuerzo que se pueden añadir en una sesión (para que no se alargue sin fin). */
  maxRefuerzosPorSesion: 4,
  /** Intentos por actividad: el segundo fallo explica de otra manera y muestra la solución. */
  intentosPorActividad: 2,
} as const;

export type Duracion = keyof typeof PARAMETROS.sesion;
export const DURACIONES: Duracion[] = ['corta', 'normal', 'larga'];
