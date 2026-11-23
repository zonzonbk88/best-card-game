// Tiny original sound effects, synthesised with WebAudio oscillators: no audio
// files, nothing borrowed. Sounds stay silent until the first pointer or key
// press unlocks the context, as browsers require.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }

  function tone(freq, at, dur, type = 'sine', gain = 0.08, slide = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sounds = {
    select() {
      tone(660, 0, 0.06, 'triangle', 0.05);
    },
    summon() {
      tone(196, 0, 0.16, 'triangle', 0.1, 60);
      tone(392, 0.03, 0.12, 'sine', 0.06);
    },
    hit() {
      tone(140, 0, 0.12, 'sawtooth', 0.1, -70);
    },
    thud() {
      tone(90, 0, 0.18, 'sine', 0.14, -40);
    },
    crumble() {
      tone(320, 0, 0.2, 'square', 0.05, -240);
    },
    heal() {
      tone(523, 0, 0.1, 'sine', 0.06);
      tone(659, 0.07, 0.1, 'sine', 0.06);
      tone(784, 0.14, 0.14, 'sine', 0.06);
    },
    kindle() {
      tone(880, 0, 0.08, 'triangle', 0.07);
      tone(1174, 0.06, 0.12, 'triangle', 0.07);
    },
    turn() {
      tone(440, 0, 0.07, 'triangle', 0.05);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.08));
    },
    loss() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.13, 0.24, 'triangle', 0.07));
    },
  };

  return {
    unlock,
    play(name) {
      if (sounds[name]) sounds[name]();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
