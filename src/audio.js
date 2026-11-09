/**
 * Mesin audio: hujan, ruang, petir prosedural + pemutaran lagu .mp3.
 * Musik keluar dari elemen <audio> lewat MediaElementSource, jadi bisa
 * di-duck otomatis saat penyiar bicara. Hujan/ruang tetap dibuat di browser.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);

// Kalibrasi bus: musik lebih dominan, hujan jadi selimut, VO paling jernih.
const MUSIC_TRIM = 1.25;
const GLASS_TRIM = 0.4;
const FAR_TRIM = 0.44;
const VOICE_TRIM = 1.3;
const DUCK_IN_WINDOW = 0.55;
const DUCK_OUT_WINDOW = 0.28;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.values = { music: 0.7, glass: 0.5, far: 0.4, warm: 0.5 };
    this.volumes = { master: 0.8, music: 0.8, rain: 0.8 };
    this.camera = { yaw: 0, pitch: 0 };
    this.rainEase = 1;
    this.level = 0;
    this.muffle = false;
    this.reduceMotion = false;
    this.onThunder = null;
    this.onTrackEnd = null;
    this.onTrackError = null;
    this.track = null;
    this.voiceActive = false;
    this.sfxTimer = null;
    this.thunderTimer = null;
    this.hidden = false;
    this._dropTimer = null;
  }

  async start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "playback" });
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.02;
    this.compressor.release.value = 0.5;
    this.master.connect(this.compressor);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    this._levelData = new Float32Array(this.analyser.fftSize);
    // Analyser disisipkan di jalur utama agar VU membaca level sebenarnya.
    this.compressor.connect(this.analyser).connect(ctx.destination);

    // Bus musik
    this.musicIn = ctx.createGain();
    this.musicIn.gain.value = 1;
    this.shelfLow = ctx.createBiquadFilter();
    this.shelfLow.type = "lowshelf";
    this.shelfLow.frequency.value = 260;
    this.shelfHigh = ctx.createBiquadFilter();
    this.shelfHigh.type = "highshelf";
    this.shelfHigh.frequency.value = 4200;
    this.musicLP = ctx.createBiquadFilter();
    this.musicLP.type = "lowpass";
    this.musicLP.frequency.value = 20000;
    this.musicLP.Q.value = 0.4;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    // Duck gain terpisah supaya pergerakan kamera/mixer tidak menghapus ducking.
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1;
    this.musicIn.connect(this.shelfLow).connect(this.shelfHigh).connect(this.musicLP).connect(this.musicGain);
    this.musicGain.connect(this.duckGain).connect(this.master);

    // Bus suara penyiar (VO) — paling jernih di atas musik.
    this.voiceIn = ctx.createGain();
    this.voiceIn.gain.value = VOICE_TRIM;
    this.voiceIn.connect(this.master);

    // Bus hujan kaca
    this.glassLP = ctx.createBiquadFilter();
    this.glassLP.type = "lowpass";
    this.glassLP.frequency.value = 20000;
    this.glassGain = ctx.createGain();
    this.glassGain.gain.value = 0;
    this.glassLP.connect(this.glassGain).connect(this.master);

    // Bus hujan jauh
    this.farLP = ctx.createBiquadFilter();
    this.farLP.type = "lowpass";
    this.farLP.frequency.value = 20000;
    this.farGain = ctx.createGain();
    this.farGain.gain.value = 0;
    this.farLP.connect(this.farGain).connect(this.master);

    // Ruang
    this.roomGain = ctx.createGain();
    this.roomGain.gain.value = 0;
    this.roomGain.connect(this.master);

    // SFX
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.noise = {
      white: this._noiseBuffer(4, "white"),
      brown: this._noiseBuffer(6, "brown"),
      pink: this._noiseBuffer(5, "pink"),
    };

    this._buildRain();
    this._buildRoom();
    this._scheduleThunder();
    this._scheduleDroplets();
    this.ready = true;
    this._applyAll(0.8);
  }

  _noiseBuffer(seconds, kind) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === "brown") {
          last = (last + 0.02 * w) / 1.02;
          data[i] = last * 3.2;
        } else if (kind === "pink") {
          last = 0.985 * last + 0.03 * w;
          data[i] = last * 2.4;
        } else {
          data[i] = w;
        }
      }
      // Loop halus
      const fade = Math.min(2000, len);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        data[i] = data[i] * t + data[len - fade + i] * (1 - t);
      }
    }
    return buf;
  }

  _loop(buf, filterType, freq, q, gainValue) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter).connect(gain);
    src.start();
    return { src, filter, gain };
  }

  _buildRain() {
    // Hujan di kaca: lapisan tinggi + lapisan rendah
    const high = this._loop(this.noise.white, "bandpass", 3400, 0.55, 0.32);
    high.gain.connect(this.glassLP);
    const low = this._loop(this.noise.pink, "lowpass", 1500, 0.5, 0.28);
    low.gain.connect(this.glassLP);
    this.glassHigh = high;
    this.glassLow = low;

    // Hujan jauh
    const far = this._loop(this.noise.brown, "lowpass", 420, 0.4, 0.9);
    far.gain.connect(this.farLP);
    this.far = far;

    // Sedikit desis kota
    const city = this._loop(this.noise.pink, "bandpass", 900, 0.6, 0.035);
    city.gain.connect(this.farLP);
    this.city = city;
  }

  _buildRoom() {
    const ctx = this.ctx;
    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 50;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.006;
    hum.connect(humGain).connect(this.roomGain);
    hum.start();
    const buzz = ctx.createOscillator();
    buzz.frequency.value = 100;
    buzz.type = "sine";
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.0018;
    buzz.connect(buzzGain).connect(this.roomGain);
    buzz.start();
    const air = this._loop(this.noise.brown, "lowpass", 170, 0.3, 0.22);
    air.gain.connect(this.roomGain);
    this.roomAir = air;
  }

  // ── Kontrol mixer ──────────────────────────────────────────────
  setFader(name, value) {
    this.values[name] = clamp(value, 0, 1);
    this._applyMixer(0.18);
  }

  setWarm(value) {
    this.values.warm = clamp(value, 0, 1);
    this._applyMixer(0.3);
  }

  setVolumes({ master, music, rain }) {
    if (master !== undefined) this.volumes.master = master;
    if (music !== undefined) this.volumes.music = music;
    if (rain !== undefined) this.volumes.rain = rain;
    this._applyMixer(0.15, true);
  }

  setCamera(yaw, pitch) {
    this.camera.yaw = yaw;
    this.camera.pitch = pitch;
    this._applyMixer(0.3);
  }

  setMuffle(on) {
    this.muffle = on;
    this._applyMixer(0.4);
  }

  setReduceMotion(on) {
    this.reduceMotion = on;
  }

  setRainEase(value) {
    this.rainEase = clamp(value, 0.35, 1);
    this._applyMixer(0.8);
  }

  /** Level RMS 0..1 untuk lampu VU di mixer. */
  getLevel() {
    if (!this.ready || !this.analyser || this.ctx.state !== "running") return 0;
    this.analyser.getFloatTimeDomainData(this._levelData);
    let sum = 0;
    for (let i = 0; i < this._levelData.length; i++) {
      const v = this._levelData[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this._levelData.length);
    this.level += (rms - this.level) * 0.22;
    return clamp(this.level * 5.5, 0, 1);
  }

  _applyAll(t) {
    this._applyMixer(t, true);
  }

  _applyMixer(t) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const { yaw, pitch } = this.camera;
    const absYaw = Math.abs(yaw);
    const side = absYaw > 40 ? 1 : absYaw > 15 ? 0.45 : 0;
    const down = pitch < -15 ? 1 : pitch < -5 ? 0.4 : 0;

    // Jendela: fokus utama saat menghadap ke depan
    const glassCam = 1 - 0.5 * side - 0.35 * down;
    const glassLP = this.muffle ? 700 : 20000 - 17000 * Math.max(side, down * 0.85);
    const farCam = 1 - 0.3 * side - 0.5 * down;
    const farLP = this.muffle ? 700 : 20000;
    const musicCam = 1 - 0.2 * side - 0 * down;
    const musicLP = this.muffle ? 700 : 20000 - 15000 * side;

    const v = this.values;
    const musicBase = Math.pow(v.music, 1.7) * 0.95 * this.volumes.music * MUSIC_TRIM;
    const ease = this.rainEase;
    const glassBase = Math.pow(v.glass, 1.5) * 0.9 * this.volumes.rain * ease * GLASS_TRIM;
    const farBase = Math.pow(v.far, 1.35) * 0.85 * this.volumes.rain * (0.8 + 0.2 * ease) * FAR_TRIM;

    const set = (param, val) => param.setTargetAtTime(val, now, t);
    set(this.master.gain, this.volumes.master);
    set(this.musicGain.gain, musicBase * musicCam);
    set(this.glassGain.gain, glassBase * glassCam);
    set(this.farGain.gain, farBase * farCam);

    set(this.musicLP.frequency, Math.max(300, musicLP));
    set(this.glassLP.frequency, Math.max(300, glassLP));
    set(this.farLP.frequency, Math.max(300, farLP));

    // Hangat: low shelf -4..+4 dB, high shelf 0..-6 dB
    const warm = v.warm;
    set(this.shelfLow.gain, -4 + 8 * warm);
    set(this.shelfHigh.gain, -6 * warm);
    set(this.roomGain.gain, 0.55 * this.volumes.rain);
  }

  // ── Musik (berkas .mp3) ────────────────────────────────────────
  playTrack(cassette, { loop = false, fade = 0.9 } = {}) {
    if (!this.ready || !cassette?.src) return false;
    this.stopMusic(0.05);
    const ctx = this.ctx;
    const el = new Audio(cassette.src);
    el.loop = loop;
    el.preload = "auto";

    const gain = ctx.createGain();
    gain.gain.value = 0;
    let source;
    try {
      source = ctx.createMediaElementSource(el);
    } catch {
      return false;
    }
    source.connect(gain).connect(this.musicIn);

    const track = { el, gain, source, cassette, ended: false, failed: false, pausedForMenu: false };
    this.track = track;

    el.addEventListener("ended", () => {
      if (this.track !== track) return;
      track.ended = true;
      this.onTrackEnd?.(cassette);
    });
    el.addEventListener("error", () => {
      if (this.track !== track) return;
      track.failed = true;
      this.onTrackError?.(cassette);
    });

    gain.gain.setTargetAtTime(1, ctx.currentTime + 0.02, fade / 3);
    el.play().catch(() => {
      if (this.track !== track) return;
      track.failed = true;
      this.onTrackError?.(cassette);
    });
    return true;
  }

  stopMusic(fade = 1.2) {
    this.fadeOutMusic(fade);
  }

  /** Fade-out lalu hentikan lagu; `done` dipanggil setelah audio benar-benar berhenti. */
  fadeOutMusic(seconds = 0.4, done) {
    const track = this.track;
    this.track = null;
    if (!track) {
      done?.();
      return;
    }
    const dur = Math.max(0.02, seconds);
    const now = this.ctx.currentTime;
    const gain = track.gain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0.0001, now + dur);
    setTimeout(() => {
      try {
        track.el.pause();
        track.source.disconnect();
        track.gain.disconnect();
      } catch {
        /* node sudah dilepas */
      }
      done?.();
    }, dur * 1000 + 60);
  }

  skipForward(seconds = 30) {
    const track = this.track;
    const dur = track?.el.duration;
    if (!track || !Number.isFinite(dur) || dur <= 0) return false;
    track.el.currentTime = Math.min(dur - 0.35, track.el.currentTime + seconds);
    return true;
  }

  getTrackTime() {
    return this.track?.el.currentTime || 0;
  }

  getTrackDuration() {
    const dur = this.track?.el.duration;
    return Number.isFinite(dur) ? dur : 0;
  }

  hasTrack() {
    return !!this.track;
  }

  isPlayingMusic() {
    const track = this.track;
    return !!track && !track.ended && !track.failed;
  }

  trackEnded() {
    return this.track?.ended === true;
  }

  /** Jadikan lagu aktif looping; kalau sudah habis, mulai lagi dari awal. */
  loopCurrent() {
    const track = this.track;
    if (!track || track.failed) return false;
    track.el.loop = true;
    if (track.ended) {
      track.ended = false;
      try {
        track.el.currentTime = 0;
      } catch {
        /* metadata belum siap */
      }
      track.el.play().catch(() => {});
    }
    return true;
  }

  trackFailed() {
    return this.track?.failed === true;
  }

  pauseMusic() {
    const track = this.track;
    if (!track || track.ended || track.failed) return;
    track.pausedForMenu = true;
    track.el.pause();
  }

  resumeMusic() {
    const track = this.track;
    if (!track?.pausedForMenu) return;
    track.pausedForMenu = false;
    track.el.play().catch(() => {
      /* biarkan diam bila browser menolak */
    });
  }

  // ── Ducking penyiar ────────────────────────────────────────────
  /** Musik meredup saat penyiar bicara, lalu naik lagi setelah selesai. */
  setVoiceActive(on) {
    this.voiceActive = on;
    this._applyDuck(on ? 0.5 : 1.2);
  }

  /** Dipanggil tiap frame saat VO aktif: window intro/interlude/outro boleh lebih keras. */
  updateDucking() {
    if (this.voiceActive) this._applyDuck(0.4);
  }

  _applyDuck(t) {
    if (!this.duckGain) return;
    const inWindow = this._inVoiceWindow();
    const target = this.voiceActive ? (inWindow ? DUCK_IN_WINDOW : DUCK_OUT_WINDOW) : 1;
    this.duckGain.gain.setTargetAtTime(target, this.ctx.currentTime, t / 3);
  }

  /**
   * Cue per kaset (detik): intro, interlude, outro adalah bagian instrumental.
   * Di luar window, musik ditahan lebih dalam supaya vokal penyanyi tidak bertabrakan.
   */
  _inVoiceWindow() {
    const track = this.track;
    const cues = track?.cassette?.cues;
    if (!track || !cues) return true;
    const t = track.el.currentTime;
    const dur = this.getTrackDuration() || Infinity;
    const [from, to] = cues.interlude || [];
    return t < (cues.intro ?? 0) || (from !== undefined && to !== undefined && t >= from && t <= to) || t >= dur - (cues.outro ?? 0);
  }

  /** Sambungkan elemen <audio> VO ke bus suara (gain 1.3), bukan langsung ke speaker. */
  attachVoice(el) {
    if (!this.ready) {
      el.volume = Math.min(1, this.volumes.master * VOICE_TRIM);
      return;
    }
    try {
      const src = this.ctx.createMediaElementSource(el);
      src.connect(this.voiceIn);
      el.volume = 1;
    } catch {
      el.volume = Math.min(1, this.volumes.master * VOICE_TRIM);
    }
  }


  // ── Petir & tetesan ────────────────────────────────────────────
  _scheduleThunder() {
    clearTimeout(this.thunderTimer);
    const wait = rand(16000, 42000);
    this.thunderTimer = setTimeout(() => {
      this._thunder();
      this._scheduleThunder();
    }, wait);
  }

  _thunder() {
    if (!this.ready || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise.brown;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.8, 0.8);
    src.connect(filter).connect(gain).connect(pan).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 5);
    if (!this.reduceMotion && this.onThunder) {
      setTimeout(() => this.onThunder(), 500 + Math.random() * 900);
    }
  }

  _scheduleDroplets() {
    clearTimeout(this._dropTimer);
    this._dropTimer = setTimeout(() => {
      if (this.ready && this.ctx.state === "running" && this.values.glass > 0.02) {
        this._droplet();
      }
      this._scheduleDroplets();
    }, rand(220, 720));
  }

  _droplet() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise.white;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = rand(2600, 5200);
    filter.Q.value = rand(6, 14);
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    const peak = rand(0.008, 0.028) * (0.4 + this.values.glass);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.05, 0.16));
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.65, 0.65);
    src.connect(filter).connect(gain).connect(pan).connect(this.glassLP);
    src.start(t, rand(0, 3), 0.3);
  }

  // ── Efek suara ─────────────────────────────────────────────────
  sfx(name) {
    if (!this.ready || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const click = (freq = 1800, dur = 0.04, vol = 0.05, pan = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise.white;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      src.connect(f).connect(g).connect(p).connect(this.sfxGain);
      src.start(t, 0, dur + 0.05);
    };
    const tone = (freq, dur, vol, type = "sine", when = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      const at = t + when;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.sfxGain);
      o.start(at);
      o.stop(at + dur + 0.05);
    };

    switch (name) {
      case "hover":
        click(2600, 0.025, 0.012, 0.1);
        break;
      case "click":
        click(2000, 0.05, 0.06);
        break;
      case "confirm":
        click(1600, 0.05, 0.05);
        tone(660, 0.5, 0.03, "sine", 0.02);
        tone(990, 0.7, 0.02, "sine", 0.14);
        break;
      case "fader":
        click(900, 0.035, 0.04);
        break;
      case "switch":
        click(1400, 0.03, 0.05);
        tone(190, 0.09, 0.022, "triangle");
        break;
      case "mug":
        click(2400, 0.04, 0.035);
        tone(520, 0.14, 0.015, "sine");
        break;
      case "curtain": {
        const src = ctx.createBufferSource();
        src.buffer = this.noise.pink;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.setValueAtTime(900, t);
        f.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
        f.Q.value = 1.1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.055, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        src.connect(f).connect(g).connect(this.sfxGain);
        src.start(t, Math.random() * 2, 0.55);
        break;
      }
      case "onAir":
        click(1200, 0.06, 0.06);
        tone(320, 0.25, 0.02, "sine");
        break;
      case "cassetteIn":
        click(420, 0.12, 0.11);
        tone(90, 0.5, 0.05, "sine");
        click(1500, 0.05, 0.05);
        break;
      case "eject":
        click(520, 0.09, 0.09);
        tone(120, 0.3, 0.04, "triangle");
        break;
      case "play":
        click(700, 0.08, 0.08);
        tone(70, 1.4, 0.03, "triangle");
        setTimeout(() => {
          if (this.ready) this.sfx("click");
        }, 180);
        break;
      case "message":
        tone(740, 1.2, 0.022, "sine");
        tone(990, 1.4, 0.015, "sine", 0.16);
        break;
      case "thunder":
        this._thunder();
        break;
      default:
        click();
    }
  }

  setHidden(hidden) {
    this.hidden = hidden;
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume();
  }

  async resume() {
    if (this.ctx && this.ctx.state !== "running") await this.ctx.resume();
  }
}
