let ctx: AudioContext | null = null;

/** Tono corto generado en el momento (sin archivos). Solo si el adulto activa el sonido. */
export function pitido(ok: boolean, activo: boolean) {
  if (!activo) return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 660 : 330; g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15);
  } catch { /* sin audio */ }
}
