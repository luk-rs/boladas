let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes a realistic referee pea-whistle blast using dual oscillators and a fast LFO.
 */
function scheduleWhistleBlast(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  isEnding = false,
) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";

  // Classic referee whistle dual resonant frequencies
  const baseFreq1 = 2520;
  const baseFreq2 = 2820;

  osc1.frequency.setValueAtTime(baseFreq1, startTime);
  osc2.frequency.setValueAtTime(baseFreq2, startTime);

  if (isEnding) {
    // Pitch drops slightly at the end of the long final whistle
    osc1.frequency.setValueCurveAtTime(
      new Float32Array([baseFreq1, baseFreq1, baseFreq1 * 0.85]),
      startTime,
      duration,
    );
    osc2.frequency.setValueCurveAtTime(
      new Float32Array([baseFreq2, baseFreq2, baseFreq2 * 0.85]),
      startTime,
      duration,
    );
  }

  // The pea inside the whistle vibrates rapidly at ~28 Hz
  lfo.frequency.setValueAtTime(28, startTime);
  lfoGain.gain.setValueAtTime(75, startTime);
  lfo.connect(osc1.frequency);
  lfo.connect(osc2.frequency);

  // Crisp whistle amplitude envelope
  const attack = 0.012;
  const decay = 0.035;
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.35, startTime + attack);
  gainNode.gain.setValueAtTime(0.35, startTime + duration - decay);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  lfo.start(startTime);
  osc1.start(startTime);
  osc2.start(startTime);

  lfo.stop(startTime + duration + 0.05);
  osc1.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
}

/**
 * Synthesizes an unmistakable South Africa 2010 style vuvuzela horn (B-flat ~233Hz)
 * with rich harmonics, plastic horn formant resonance, and lip flutter.
 */
export function playVuvuzela(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.6;

  // Horn pitch: Bb3 (~233.08 Hz) with authentic attack scoop
  const basePitch = 233.08;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const oscSub = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();

  // Low frequency lip flutter
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  oscSub.type = "triangle";

  // Slight natural detune between harmonic horn layers
  osc1.detune.setValueAtTime(0, now);
  osc2.detune.setValueAtTime(6, now);

  // Pitch envelope: player blowing scoops up into pitch
  osc1.frequency.setValueAtTime(basePitch * 0.94, now);
  osc1.frequency.exponentialRampToValueAtTime(basePitch, now + 0.12);
  osc2.frequency.setValueAtTime(basePitch * 0.94, now);
  osc2.frequency.exponentialRampToValueAtTime(basePitch, now + 0.12);
  oscSub.frequency.setValueAtTime(basePitch, now);

  // Horn formant filter: nasal plastic megaphone resonance
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(940, now);
  filter.Q.setValueAtTime(2.2, now);

  // Lip buzz LFO (~6.5 Hz)
  lfo.frequency.setValueAtTime(6.5, now);
  lfoGain.gain.setValueAtTime(3.5, now);
  lfo.connect(osc1.frequency);
  lfo.connect(osc2.frequency);

  // Volume swell and release
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.15); // swell attack
  gainNode.gain.setValueAtTime(0.26, now + duration - 0.35);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  oscSub.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  lfo.start(now);
  osc1.start(now);
  osc2.start(now);
  oscSub.start(now);

  lfo.stop(now + duration + 0.05);
  osc1.stop(now + duration + 0.05);
  osc2.stop(now + duration + 0.05);
  oscSub.stop(now + duration + 0.05);
}

/**
 * Starting whistle: double blast (tweet - tweeeet)
 */
export function playWhistleStart(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  scheduleWhistleBlast(ctx, now, 0.12);
  scheduleWhistleBlast(ctx, now + 0.19, 0.38);
}

/**
 * Pause whistle: single crisp blast (tweeeet)
 */
export function playWhistlePause(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  scheduleWhistleBlast(ctx, now, 0.22);
}

/**
 * Final whistle: classic triple blast (tweet - tweet - tweeeeeeeet!)
 */
export function playWhistleEnd(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  scheduleWhistleBlast(ctx, now, 0.14);
  scheduleWhistleBlast(ctx, now + 0.22, 0.14);
  scheduleWhistleBlast(ctx, now + 0.44, 0.75, true);
}
