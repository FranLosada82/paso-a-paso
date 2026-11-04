import type { Idioma } from '../types';

export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const IDIOMA: Record<Idioma, string> = { es: 'es-ES', en: 'en-GB' };

// Los navegadores cargan la lista de voces más tarde (la primera llamada suele devolver []), y en Android a veces
// nunca la dan: se pide al arrancar y se vuelve a leer cuando cambia.
let voces: SpeechSynthesisVoice[] = [];
function cargarVoces() {
  if (!hayVoz()) return;
  voces = speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voces = speechSynthesis.getVoices(); });
}
cargarVoces();

/** Prefiere una voz instalada en el dispositivo (funciona sin conexión y no envía el texto a nadie). */
function elegirVoz(idioma: Idioma): SpeechSynthesisVoice | undefined {
  if (!voces.length) voces = speechSynthesis.getVoices();
  const delIdioma = voces.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(idioma));
  const preferida = new RegExp(IDIOMA[idioma], 'i');
  return delIdioma.find((v) => v.localService && preferida.test(v.lang)) ?? delIdioma.find((v) => v.localService);
}

// Referencia a la frase en curso: Chrome la descarta a veces antes de leerla si nadie la guarda.
let enCurso: SpeechSynthesisUtterance | null = null;

/** Lee el texto en voz alta. Sin lista de voces, usa la voz del sistema para ese idioma. */
export function hablar(texto: string, idioma: Idioma) {
  if (!hayVoz()) return;
  // Sin emojis ni flechas, que algunas voces leen en voz alta («cara sonriente»…).
  const limpio = texto.replace(/\p{Extended_Pictographic}|[←-⇿]|️/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!limpio) return;
  // Cancelar justo antes de hablar deja mudo a Chrome: solo se cancela si ya está hablando.
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(limpio);
  const voz = elegirVoz(idioma);
  u.lang = voz?.lang ?? IDIOMA[idioma];
  if (voz) u.voice = voz;
  u.rate = 0.9;
  u.onend = () => { if (enCurso === u) enCurso = null; };
  enCurso = u;
  // Safari puede quedarse en pausa tras salir de la app.
  speechSynthesis.resume();
  speechSynthesis.speak(u);
}

export const callar = () => { if (hayVoz() && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); };
