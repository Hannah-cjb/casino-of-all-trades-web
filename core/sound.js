window.Sound = (() => {
  let ctx = null;
  let muted = false;

  function audio() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, volume, delay) {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const start = ac.currentTime + (delay || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.06, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function click() {
    tone(520, 0.05, 'triangle', 0.04);
  }

  function chip() {
    tone(880, 0.04, 'square', 0.025);
    tone(1320, 0.05, 'square', 0.02, 0.03);
  }

  function card() {
    tone(300, 0.06, 'sawtooth', 0.02);
  }

  function win() {
    tone(523, 0.12, 'triangle', 0.07);
    tone(659, 0.12, 'triangle', 0.07, 0.1);
    tone(784, 0.18, 'triangle', 0.08, 0.2);
    tone(1046, 0.28, 'triangle', 0.08, 0.34);
  }

  function lose() {
    tone(220, 0.18, 'sawtooth', 0.04);
    tone(165, 0.3, 'sawtooth', 0.04, 0.14);
  }

  function tick() {
    tone(1400, 0.02, 'square', 0.012);
  }

  function spinStart() {
    tone(180, 0.4, 'sawtooth', 0.03);
    tone(240, 0.3, 'triangle', 0.02, 0.15);
  }

  function setMuted(value) {
    muted = Boolean(value);
  }

  function isMuted() {
    return muted;
  }

  return { click, chip, card, win, lose, tick, spinStart, setMuted, isMuted };
})();
