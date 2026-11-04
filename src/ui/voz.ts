import type { Idioma } from '../types';

export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Prefiere una voz instalada en el dispositivo (funciona sin conexión y no envía el texto a nadie). */
function elegirVoz(idioma: Idioma): SpeechSynthesisVoice | undefined {
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(idioma));
  return voces.find((v) => v.localService && /es-ES|en-GB/i.test(v.lang)) ?? voces.find((v) => v.localService) ?? undefined;
}

/** Lee el texto en voz alta con la voz del sistema. Sin voz local adecuada, no hace nada. */
export function hablar(texto: string, idioma: Idioma) {
  if (!hayVoz()) return;
  const voz = elegirVoz(idioma);
  if (!voz) return;
  speechSynthesis.cancel();
  // Sin emojis ni flechas, que algunas voces leen en voz alta («cara sonriente»…).
  const limpio = texto.replace(/\p{Extended_Pictographic}|[\u2190-\u21FF]|\uFE0F/gu, ' ').replace(/\s+/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(limpio);
  u.voice = voz; u.lang = voz.lang; u.rate = 0.9;
  speechSynthesis.speak(u);
}

export const callar = () => { if (hayVoz()) speechSynthesis.cancel(); };
