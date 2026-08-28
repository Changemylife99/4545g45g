/* Tiny synthesized SFX engine — no samples, all WebAudio. */

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, delay = 0, q = 0.8) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  shoot() {
    this.noise(0.13, 0.5, 2600);
    this.tone("square", 160, 52, 0.1, 0.3);
    this.tone("sawtooth", 900, 140, 0.06, 0.12);
  }
  empty() {
    this.tone("square", 1100, 700, 0.04, 0.12);
  }
  reload() {
    this.tone("square", 480, 320, 0.05, 0.16);
    this.tone("square", 640, 420, 0.05, 0.16, 0.16);
    this.noise(0.05, 0.14, 3200, 0.3);
  }
  hit() {
    this.tone("triangle", 1500, 900, 0.05, 0.22);
  }
  kill() {
    this.tone("sawtooth", 300, 60, 0.28, 0.26);
    this.noise(0.2, 0.2, 900, 0.02);
  }
  hurt() {
    this.tone("sine", 140, 50, 0.22, 0.4);
    this.noise(0.16, 0.22, 700);
  }
  pickup() {
    this.tone("triangle", 620, 620, 0.07, 0.2);
    this.tone("triangle", 930, 930, 0.09, 0.2, 0.08);
  }
  spit() {
    this.tone("sine", 500, 180, 0.14, 0.18);
  }
  splat() {
    this.noise(0.1, 0.16, 1200);
    this.tone("sine", 220, 90, 0.1, 0.12);
  }
  growl() {
    this.tone("sawtooth", 120, 70, 0.3, 0.2);
  }
  roar() {
    this.tone("sawtooth", 90, 38, 1.1, 0.4);
    this.tone("sawtooth", 130, 55, 1.0, 0.25, 0.05);
    this.noise(0.9, 0.2, 500, 0.1);
  }
  wave() {
    this.tone("sawtooth", 196, 196, 0.22, 0.16);
    this.tone("sawtooth", 294, 294, 0.3, 0.16, 0.14);
  }
  heartbeat() {
    this.tone("sine", 70, 45, 0.12, 0.4);
    this.tone("sine", 62, 40, 0.1, 0.3, 0.18);
  }
  portal() {
    this.tone("sine", 240, 760, 0.24, 0.14);
  }
  ui() {
    this.tone("square", 720, 520, 0.06, 0.12);
  }
}
