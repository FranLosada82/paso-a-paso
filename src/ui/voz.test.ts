import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Frase { text: string; lang: string; voice?: { name: string } }
const dichas: Frase[] = [];
let lista: { name: string; lang: string; localService: boolean }[] = [];
const sintesis = {
  speaking: false, pending: false,
  getVoices: () => lista,
  speak: (u: Frase) => { dichas.push(u); },
  cancel: vi.fn(), resume: vi.fn(), addEventListener: vi.fn(),
};
Object.assign(globalThis, {
  window: globalThis,
  speechSynthesis: sintesis,
  SpeechSynthesisUtterance: class { lang = ''; voice?: unknown; rate = 1; onend?: () => void; constructor(public text: string) {} },
});
const { hablar } = await import('./voz');

describe('voz', () => {
  beforeEach(() => { dichas.length = 0; sintesis.cancel.mockClear(); });
  it('habla aunque el navegador aún no haya cargado la lista de voces (primer toque, Android)', () => {
    lista = [];
    hablar('¿Cuántas decenas hay?', 'es');
    expect(dichas).toHaveLength(1);
    expect(dichas[0].lang).toBe('es-ES');
  });
  it('usa una voz instalada del idioma cuando la hay', () => {
    lista = [{ name: 'Online', lang: 'es-ES', localService: false }, { name: 'Mónica', lang: 'es-ES', localService: true }, { name: 'Daniel', lang: 'en-GB', localService: true }];
    hablar('Hello', 'en');
    expect(dichas[0].voice?.name).toBe('Daniel');
    hablar('Hola', 'es');
    expect(dichas[1].voice?.name).toBe('Mónica');
  });
  it('quita emojis y no cancela si no estaba hablando (Chrome se queda mudo)', () => {
    hablar('📦📦 Dos paquetes', 'es');
    expect(dichas[0].text).toBe('Dos paquetes');
    expect(sintesis.cancel).not.toHaveBeenCalled();
  });
});
