import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/latin-400-italic.css";
import "@fontsource/lora/latin-500.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "./styles.css";

import { CASSETTES, LISTENERS, MONOLOGUES, RECAP_TITLES, TONES } from "./data.js";
import { AudioEngine } from "./audio.js";
import { SceneRig } from "./scene.js";

// ── Simpanan ────────────────────────────────────────────────────
const RUN_KEY = "penyiarsunyi.run";
const META_KEY = "penyiarsunyi.meta";
const SCHEMA = 2;
// Jeda singkat setelah kaset masuk, lalu pesan pendengar muncul di atas lagu.
const SESSION_INTRO_MS = 2400;

// Waktu akhir tiap baris (detik) pada file VO gabungan, hasil transkripsi.
// Dipakai supaya subtitle berganti tepat saat kalimatnya selesai diucapkan.
const OPENING_LINE_ENDS = [3.94, 10.56, 16.42];
const CLOSING_LINE_ENDS = {
  low: [5.48, 10.66, 16.28, 18.8],
  mid: [4.88, 9.76, 15.84, 19.96],
  high: [5.58, 11.5, 16.76, 22.54],
};

const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.8,
  rain: 0.8,
  text: 1,
  quality: "high",
  subtitle: true,
  reduce: false,
  voice: true,
};

function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA, ...value }));
  } catch {
    /* penyimpanan tidak tersedia — game tetap berjalan di memori */
  }
}

function removeStore(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

const meta = readStore(META_KEY) || {};
const settings = { ...DEFAULT_SETTINGS, ...(meta.settings || {}) };

// ── Elemen ──────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const fade = $("fade");
const hud = $("hud");
const onAirEl = $("onAir");
const clockEl = $("clock");
const progressEl = $("progress");
const titleScreen = $("titleScreen");
const messagePanel = $("messagePanel");
const responsePanel = $("responsePanel");
const replyPanel = $("replyPanel");
const subtitlePanel = $("subtitlePanel");
const subtitleText = $("subtitleText");
const rackPanel = $("rackPanel");
const rackGrid = $("rackGrid");
const rackEyebrow = $("rackEyebrow");
const rackTitle = $("rackTitle");
const zenHud = $("zenHud");
const zenTitle = $("zenTitle");
const zenStyle = $("zenStyle");
const zenHint = $("zenHint");
const zenNext = $("zenNext");
const zenTime = $("zenTime");
const zenSkip = $("zenSkip");
const zenFf = $("zenFf");
const recapScreen = $("recapScreen");
const recapGrid = $("recapGrid");
const recapTitle = $("recapTitle");
const recapSub = $("recapSub");
const settingsPanel = $("settingsPanel");
const pausePanel = $("pausePanel");
const hoverTip = $("hoverTip");
const toastEl = $("toast");
const pcWarning = $("pcWarning");

// ── Mesin ───────────────────────────────────────────────────────
const audio = new AudioEngine();
let scene;
let paused = false;
let pending = [];
let pendingId = 0;
let toastId = null;
let qualityLocked = false;
let fpsAccum = 0;
let fpsFrames = 0;
let lowFpsTime = 0;

const G = {
  phase: "BOOT",
  mode: "night",
  listenerIndex: 0,
  current: null,
  selectedResponse: null,
  selectedCassette: null,
  sessionCassette: null,
  closeness: {},
  played: [],
  clock: "22:00",
  pausedFrom: null,
  sub: null,
  zen: null,
  dawnTarget: 0,
  dawnCurrent: 0,
  dawnDirty: true,
  hoveredChannel: null,
  selectedChannel: null,
  rackContext: null,
  rackLocked: false,
};

const CHANNELS = {
  music: "Lagu",
  glass: "Hujan Kaca",
  far: "Hujan Jauh",
  warm: "Hangat",
};

// ── Utilitas ────────────────────────────────────────────────────
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function schedule(ms, fn) {
  const id = ++pendingId;
  pending.push({ id, left: ms, fn });
  return id;
}

function cancel(id) {
  pending = pending.filter((p) => p.id !== id);
}

function clearPending() {
  pending = [];
}

function tickPending(dtMs) {
  if (!pending.length) return;
  const list = pending.slice();
  for (const p of list) {
    p.left -= dtMs;
    if (p.left <= 0) {
      pending = pending.filter((x) => x !== p);
      p.fn();
    }
  }
}

function show(el, visible = true) {
  el.hidden = !visible;
}

function showOnly(...els) {
  const keep = new Set(els);
  for (const el of [messagePanel, responsePanel, replyPanel, subtitlePanel, rackPanel, zenHud, recapScreen]) {
    el.hidden = !keep.has(el);
  }
}

function toast(text, ms = 2600) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastId);
  toastId = setTimeout(() => (toastEl.hidden = true), ms);
}

function vibeClock() {
  clockEl.textContent = G.mode === "free" ? "BEBAS" : G.clock;
  if (G.mode === "free") {
    progressEl.textContent = "91,7";
  } else if (G.phase === "JEDA_HUJAN") {
    progressEl.textContent = "JEDA HUJAN";
  } else if (G.phase === "PEMBUKAAN" || G.phase === "PENUTUPAN") {
    progressEl.textContent = "— / 08";
  } else {
    progressEl.textContent = `${String(Math.min(G.listenerIndex + 1, 8)).padStart(2, "0")} / 08`;
  }
}

function setOnAir(on) {
  onAirEl.classList.toggle("live", on);
  scene?.setOnAir(on);
}

function closenessKey(score) {
  return score >= 2 ? "hangat" : score === 1 ? "biasa" : "tenang";
}

function closingKey(total) {
  return total <= 6 ? "low" : total <= 11 ? "mid" : "high";
}

function totalCloseness() {
  return Object.values(G.closeness).reduce((a, b) => a + b, 0);
}

// ── Suara penyiar (Audio file / ElevenLabs & Fallback) ─────────
let voice = null;
let currentVoiceAudio = null;

function pickVoice() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  voice =
    voices.find((v) => /^id[-_]/i.test(v.lang)) ||
    voices.find((v) => /indonesia/i.test(v.name)) ||
    null;
}
if (window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

function stopSpeech() {
  if (currentVoiceAudio) {
    currentVoiceAudio.pause();
    currentVoiceAudio.currentTime = 0;
    currentVoiceAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function speakFallback(text) {
  if (!settings.voice || !voice || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = "id-ID";
  u.rate = 0.86;
  u.pitch = 0.82;
  u.volume = 0.85 * settings.master;
  window.speechSynthesis.speak(u);
}

function playVoiceAudio(key, text, onEnded) {
  stopSpeech();
  if (!settings.voice) return null;

  if (key) {
    const audioEl = new Audio(`/voices/${key}.mp3`);
    audio.attachVoice(audioEl);
    let hasEnded = false;

    const finish = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (currentVoiceAudio === audioEl) currentVoiceAudio = null;
      if (onEnded) onEnded();
    };

    audioEl.addEventListener("ended", finish);

    audioEl.addEventListener("error", () => {
      // Audio file not found or couldn't load, fallback to browser speech synthesis
      if (currentVoiceAudio === audioEl) currentVoiceAudio = null;
      speakFallback(text);
    }, { once: true });

    currentVoiceAudio = audioEl;
    audioEl.play().catch(() => {
      if (currentVoiceAudio === audioEl) currentVoiceAudio = null;
      speakFallback(text);
    });

    return audioEl;
  } else {
    speakFallback(text);
    return null;
  }
}

// ── Subtitle / monolog ───────────────────────────────────────────
function playMonologue(lines, onDone, lineKeys = null, segmentKey = null, opts = {}) {
  // Talk-over: subtitle muncul di atas HUD lagu yang tetap terlihat.
  if (opts.overTrack) show(subtitlePanel, true);
  else showOnly(subtitlePanel);
  if (!opts.overTrack) {
    G.phase = G.phase === "PEMBUKAAN" || G.phase === "PENUTUPAN" || G.phase === "JEDA_HUJAN" ? G.phase : "VO";
  }
  G.sub = {
    lines,
    lineKeys,
    segmentKey,
    index: 0,
    onDone,
    mode: "line",
    audio: null,
    lineEnds: [],
    endsSec: opts.timing?.length === lines.length ? [...opts.timing] : null,
    overTrack: !!opts.overTrack,
  };
  setOnAir(true);
  audio.sfx("onAir");
  // Ducking hanya saat VO benar-benar berbunyi.
  audio.setVoiceActive(!!settings.voice);
  subtitlePanel.hidden = false;

  if (settings.voice && segmentKey) {
    const combinedAudio = new Audio(`/voices/${segmentKey}.mp3`);
    audio.attachVoice(combinedAudio);
    let resolved = false;

    const startCombined = () => {
      if (resolved || !G.sub) return;
      resolved = true;
      G.sub.mode = "combined";
      G.sub.audio = combinedAudio;
      currentVoiceAudio = combinedAudio;

      const totalChars = lines.reduce((sum, l) => sum + Math.max(1, l.length), 0);
      let accum = 0;
      G.sub.lineEnds = lines.map((l) => {
        accum += Math.max(1, l.length);
        return accum / totalChars;
      });
      // Bila timing absolut tersedia, pakai itu; durasi audio dipakai untuk
      // mengubah detik menjadi fraksi saat lompat baris.
      const absEnds = G.sub.endsSec;
      const syncEndsToDuration = () => {
        const dur = combinedAudio.duration;
        if (!absEnds || !Number.isFinite(dur) || dur <= 0) return;
        G.sub.lineEnds = absEnds.map((t) => clamp01(t / dur));
      };

      combinedAudio.addEventListener("timeupdate", () => {
        if (!G.sub || G.sub.mode !== "combined" || G.sub.audio !== combinedAudio) return;
        const dur = combinedAudio.duration;
        if (!Number.isFinite(dur) || dur <= 0) return;
        const now = combinedAudio.currentTime;
        let target = 0;
        if (absEnds) {
          while (target < absEnds.length - 1 && now >= absEnds[target]) target++;
        } else {
          const frac = now / dur;
          while (target < G.sub.lineEnds.length - 1 && frac >= G.sub.lineEnds[target]) target++;
        }
        if (target !== G.sub.index && target < G.sub.lines.length) {
          G.sub.index = target;
          renderLineText();
        }
      });

      combinedAudio.addEventListener("loadedmetadata", syncEndsToDuration);

      combinedAudio.addEventListener("ended", () => {
        if (G.sub && G.sub.audio === combinedAudio) {
          currentVoiceAudio = null;
          G.sub.timer = schedule(500, finishMonologue);
        }
      }, { once: true });

      combinedAudio.play().catch(() => {
        fallbackToLine();
      });

      renderLineText();
    };

    const fallbackToLine = () => {
      if (resolved || !G.sub) return;
      resolved = true;
      combinedAudio.pause();
      G.sub.mode = "line";
      renderLine();
    };

    combinedAudio.addEventListener("canplaythrough", startCombined, { once: true });
    combinedAudio.addEventListener("error", fallbackToLine, { once: true });

    // Fallback timer if combined audio doesn't load within 500ms
    setTimeout(() => {
      if (!resolved) fallbackToLine();
    }, 500);
  } else {
    G.sub.mode = "line";
    renderLine();
  }
}

function renderLineText() {
  const sub = G.sub;
  if (!sub) return;
  const line = sub.lines[sub.index];
  subtitleText.textContent = line;
  subtitleText.classList.remove("line-in");
  void subtitleText.offsetWidth;
  subtitleText.classList.add("line-in");
}

function renderLine() {
  const sub = G.sub;
  if (!sub) return;
  renderLineText();

  const line = sub.lines[sub.index];
  const key = sub.lineKeys ? sub.lineKeys[sub.index] : null;
  const defaultDur = Math.max(3600, 1700 + line.length * 105);

  if (settings.voice && key) {
    let advanced = false;
    const onEnded = () => {
      if (advanced) return;
      advanced = true;
      sub.timer = schedule(450, advanceSubtitle);
    };

    const audioObj = playVoiceAudio(key, line, onEnded);
    if (!audioObj) {
      sub.timer = schedule(defaultDur, advanceSubtitle);
    } else {
      audioObj.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(audioObj.duration) && audioObj.duration > 0) {
          if (sub.timer) cancel(sub.timer);
          sub.timer = schedule((audioObj.duration * 1000) + 500, advanceSubtitle);
        }
      }, { once: true });
      sub.timer = schedule(defaultDur, advanceSubtitle);
    }
  } else {
    if (settings.voice) speakFallback(line);
    sub.timer = schedule(defaultDur, advanceSubtitle);
  }
}

function advanceSubtitle() {
  const sub = G.sub;
  if (!sub) return;
  if (sub.timer) cancel(sub.timer);

  if (sub.mode === "combined" && sub.audio) {
    if (sub.index < sub.lines.length - 1) {
      sub.index += 1;
      if (Number.isFinite(sub.audio.duration) && sub.audio.duration > 0) {
        const prevEnd = sub.endsSec
          ? sub.endsSec[sub.index - 1]
          : sub.lineEnds[sub.index - 1] * sub.audio.duration;
        sub.audio.currentTime = prevEnd;
      }
      renderLineText();
      return;
    } else {
      finishMonologue();
      return;
    }
  }

  stopSpeech();
  sub.index += 1;
  if (sub.index >= sub.lines.length) {
    finishMonologue();
    return;
  }
  renderLine();
}

function finishMonologue() {
  const sub = G.sub;
  G.sub = null;
  if (sub?.timer) cancel(sub.timer);
  stopSpeech();
  audio.setVoiceActive(false);
  subtitlePanel.hidden = true;
  setOnAir(false);
  audio.sfx("click");
  // VO di atas intro selesai: tampilkan lagi kontrol lagu.
  if (sub?.overTrack && G.zen) show(zenHud, true);
  const done = sub?.onDone;
  it(() => done?.());
}

/** Batalkan monolog yang sedang jalan (dipakai saat skip/pause/menu). */
function cancelMonologue() {
  const sub = G.sub;
  if (!sub) return;
  if (sub.timer) cancel(sub.timer);
  G.sub = null;
  stopSpeech();
  audio.setVoiceActive(false);
  subtitlePanel.hidden = true;
  setOnAir(false);
}

// kecil: jalankan callback setelah jeda yang ikut pause
function it(fn, ms = 420) {
  schedule(ms, fn);
}

// ── Layar & fokus ───────────────────────────────────────────────
function updateHud() {
  vibeClock();
}

function enterOpening() {
  clearPending();
  G.mode = "night";
  G.phase = "PEMBUKAAN";
  G.listenerIndex = 0;
  G.closeness = {};
  G.played = [];
  G.selectedResponse = null;
  G.selectedCassette = null;
  G.sessionCassette = null;
  G.clock = "22:00";
  G.dawnTarget = 0;
  scene.setDawn(0);
  scene.setLookMode(false);
  scene.setFocus(0, -2);
  scene.setRainEase(1);
  audio.setRainEase(1);
  scene.setScreenText(["SUNYI FM 91,7", "teman jaga"]);
  hud.classList.add("is-visible");
  hud.classList.remove("zen");
  updateHud();
  playMonologue(
    MONOLOGUES.opening,
    () => openRack("opening"),
    MONOLOGUES.opening.map((_, i) => `opening_${i}`),
    "opening",
    { timing: OPENING_LINE_ENDS },
  );
  saveRun();
}

function enterListener(index) {
  clearPending();
  const listener = LISTENERS[index];
  if (!listener) {
    startClosing();
    return;
  }
  G.listenerIndex = index;
  G.current = listener;
  G.phase = "PESAN";
  G.clock = listener.clock;
  G.selectedResponse = null;
  G.selectedCassette = G.sessionCassette || null;
  G.selectedChannel = null;
  G.mode = "night";
  G.dawnTarget = 0;
  scene.setLookMode(false);
  scene.setFocus(11, -4);
  scene.setRainEase(1);
  audio.setRainEase(1);
  scene.setScreenText([listener.handle.toUpperCase(), "pesan masuk"]);
  hud.classList.add("is-visible");
  hud.classList.remove("zen");
  updateHud();

  $("msgFrom").textContent = listener.handle.toUpperCase();
  $("msgTime").textContent = listener.clock;
  $("msgText").textContent = messageFor(listener);
  showOnly(messagePanel);
  audio.sfx("message");
  saveRun();
}

function messageFor(listener) {
  if (listener.id === "L7" && listener.messages) {
    const rani = G.closeness.L1 ?? 0;
    return listener.messages[rani >= 2 ? "high" : rani === 1 ? "mid" : "low"];
  }
  return listener.message;
}

function showResponses() {
  if (G.phase !== "PESAN") return;
  G.phase = "RESPONS";
  clearPending();
  const listener = G.current;
  scene.setFocus(0, -3);
  const grid = $("responseGrid");
  grid.innerHTML = "";
  listener.responses.forEach((r, i) => {
    const btn = document.createElement("button");
    btn.className = "response-card";
    btn.innerHTML = `
      <span class="rc-top">
        <span class="rc-tone">${TONES[r.tone]}</span>
        <span class="rc-index">${i + 1}</span>
      </span>
      <span class="rc-label">${r.label}</span>
      <span class="rc-hint">${r.tone === "menemani" ? "hadir, tanpa menghakimi" : r.tone === "menenangkan" ? "menurunkan ketegangan" : "menyemangati pelan"}</span>
    `;
    btn.addEventListener("click", () => chooseResponse(r));
    grid.appendChild(btn);
  });
  showOnly(responsePanel);
}

function chooseResponse(response) {
  if (G.phase !== "RESPONS") return;
  G.selectedResponse = response;
  audio.sfx("confirm");
  // Lagu sudah diputar sebelum pesan masuk. Jawaban penyiar langsung dibacakan
  // di atas lagu itu (musik meredup), lalu balasan pendengar tampil.
  const key = `${G.current.id}_${response.id}`;
  playMonologue(response.lines, showReply, response.lines.map((_, i) => `${key}_${i}`), key);
}

function openRack(context) {
  clearPending();
  G.phase = "KASET";
  G.rackContext = context;
  G.rackLocked = false;
  G.rackContext = context;
  const copy = {
    opening: {
      eyebrow: "KASET PEMBUKA",
      title: "Satu lagu untuk sesi pertama",
      hint: "Lagu ini menemani pendengar pertama sampai selesai.",
    },
    next: {
      eyebrow: "KASET BERIKUTNYA",
      title: "Pilih lagu sebelum pesan masuk",
      hint: "Lagu ini akan menemani pendengar berikutnya.",
    },
    closing: {
      eyebrow: "KASET PENUTUP",
      title: "Satu lagu sebelum pagi",
      hint: "Kaset terakhir biasanya mengakhiri malam.",
    },
    free: {
      eyebrow: "RUANG SIARAN BEBAS",
      title: "Pilih lagu, lalu tinggal sebentar",
      hint: "Tidak ada pesan. Tidak ada yang perlu dijawab.",
    },
  }[context];
  rackEyebrow.textContent = copy.eyebrow;
  rackTitle.textContent = copy.title;
  document.querySelector(".rack-hint").textContent = copy.hint;
  renderRack(context);
  showOnly(rackPanel);
  scene.setFocus(-11, -7);
  audio.sfx("click");
}

function renderRack(context) {
  rackGrid.innerHTML = "";
  CASSETTES.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "cassette";
    if (context === "closing" && i === CASSETTES.length - 1) btn.classList.add("suggested");
    btn.setAttribute("aria-label", `${c.title}, ${c.artist}, ${c.style}${c.tags.length ? ", " + c.tags.join(", ") : ""}`);
    btn.innerHTML = `
      <span class="cassette-no">${String(i + 1).padStart(2, "0")}</span>
      ${cassetteSvg(i)}
      <p class="cassette-title">${c.title}</p>
      <p class="cassette-style">${c.artist} · ${c.style}</p>
      <span class="cassette-tags">${c.tags.map((t) => `<span>${t}</span>`).join("")}</span>
    `;
    btn.addEventListener("click", () => chooseCassette(c));
    rackGrid.appendChild(btn);
  });
}

function cassetteSvg(index) {
  const tint = ["#c9a179", "#7fb8b0", "#d98c8c", "#b9a7c9", "#9fb9a0"][index % 5];
  return `
    <svg viewBox="0 0 200 120" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="194" height="114" rx="7" stroke="${tint}" stroke-opacity=".5" />
      <rect x="13" y="13" width="174" height="94" rx="4" fill="#0b0e16" stroke="${tint}" stroke-opacity=".22" />
      <rect x="27" y="24" width="146" height="46" rx="3" fill="${tint}" fill-opacity=".08" stroke="${tint}" stroke-opacity=".3" />
      <circle cx="66" cy="47" r="13" stroke="${tint}" stroke-opacity=".65" />
      <circle cx="134" cy="47" r="13" stroke="${tint}" stroke-opacity=".65" />
      <circle cx="66" cy="47" r="5" fill="${tint}" fill-opacity=".28" />
      <circle cx="134" cy="47" r="5" fill="${tint}" fill-opacity=".28" />
      <path d="M66 60h68" stroke="${tint}" stroke-opacity=".35" />
      <rect x="27" y="82" width="146" height="16" rx="2" stroke="${tint}" stroke-opacity=".22" />
      <circle cx="43" cy="90" r="2.5" fill="${tint}" fill-opacity=".5" />
      <circle cx="157" cy="90" r="2.5" fill="${tint}" fill-opacity=".5" />
    </svg>`;
}

function chooseCassette(cassette) {
  if (G.phase !== "KASET" || G.rackLocked) return;
  G.rackLocked = true;
  G.selectedCassette = cassette;
  const card = [...rackGrid.children][CASSETTES.indexOf(cassette)];
  card?.classList.add("selected");
  audio.sfx("confirm");
  const context = G.rackContext;
  schedule(720, () => {
    G.rackLocked = false;
    show(rackPanel, false);
    startTrack(cassette, context);
  });
}

function startTrack(cassette, context) {
  const session = context === "opening" || context === "next";
  G.selectedCassette = cassette;
  G.sessionCassette = cassette;
  audio.playTrack(cassette, { loop: context === "free" || session });
  scene.setPlaying(true);
  scene.setScreenText([cassette.title, cassette.style]);
  audio.sfx("cassetteIn");
  schedule(220, () => audio.sfx("play"));

  if (!G.played.includes(cassette.id)) G.played.push(cassette.id);

  if (session) {
    const target = context === "opening" ? 0 : G.listenerIndex;
    startZen(cassette, {
      label: context === "opening" ? "Kaset pembuka" : "Kaset berikutnya",
      onDone: () => enterListener(target),
      fallback: 55,
      keepMusic: true,
      session: true,
    });
    // Lagu sudah berjalan; pesan pendengar masuk sebentar kemudian.
    schedule(SESSION_INTRO_MS, () => {
      if (G.zen?.session) endZen();
    });
  } else if (context === "closing") {
    startZen(cassette, {
      label: "Kaset penutup",
      onDone: finishNight,
      fallback: 40,
    });
  } else if (context === "free") {
    startZen(cassette, {
      label: "Ruang Siaran Bebas",
      free: true,
    });
    toast("Klik lampu, gorden, lampu gantung, atau cangkir di ruangan.", 4200);
  }
}

function startZen(cassette, { label, onDone, free = false, fallback = 40, keepMusic = false, session = false }) {
  G.phase = free ? "BEBAS" : "ZEN";
  clearPending();
  G.zen = { elapsed: 0, onDone, shown: false, cassette, fallback, timeLabel: "", keepMusic, session };
  zenTitle.textContent = cassette.title;
  zenStyle.textContent = `${cassette.artist} · ${cassette.style}`;
  zenHint.innerHTML = free
    ? "Gerakkan mouse · seret fader · klik lampu/gorden · <kbd>N</kbd> ganti lagu · <kbd>C</kbd> tutup telinga"
    : `${label} · gerakkan mouse · seret fader · klik lampu/gorden · <kbd>N</kbd> lewati lagu`;
  zenNext.hidden = !free;
  zenNext.innerHTML = free ? "Kembali ke Menu <kbd>Esc</kbd>" : `Lanjut <kbd>Space</kbd>`;
  zenTime.textContent = "";
  showOnly(zenHud);
  hud.classList.add("zen");
  scene.setLookMode(true);
  scene.setFocus(0, -4);
  scene.setRainEase(1);
  audio.setRainEase(1);
  setOnAir(false);
  updateHud();
  saveRun();
}

/**
 * Selesaikan fase lagu. `fade` kecil dipakai saat skip (fade-out sudah jalan).
 */
function endZen({ fade = 2.2, keepMusic } = {}) {
  const zen = G.zen;
  if (!zen) return;
  const musicStays = keepMusic ?? zen.keepMusic;
  G.zen = null;
  zenNext.hidden = true;
  show(zenHud, false);
  hud.classList.remove("zen");
  cancelMonologue();
  scene.setLookMode(false);
  if (musicStays) {
    // Lagu tetap berputar (loop) menemani balasan dan sesi berikutnya.
    scene.setPlaying(audio.loopCurrent());
  } else {
    audio.stopMusic(fade);
    scene.setPlaying(false);
  }
  clearPending();
  zen.onDone?.();
}

/** Tombol skip / tombol N: fade-out 0,4 detik lalu lanjut ke fase berikutnya. */
function skipCurrentTrack() {
  if (G.phase !== "ZEN" && G.phase !== "BEBAS") return;
  const zen = G.zen;
  if (!zen) return;
  if (G.phase === "BEBAS") zen.onDone = () => openRack("free");
  cancelMonologue();
  audio.fadeOutMusic(0.4, () => {
    audio.sfx("eject");
    endZen({ fade: 0.02, keepMusic: false });
  });
}

function fastForwardTrack(seconds = 30) {
  if (G.phase !== "ZEN" && G.phase !== "BEBAS") return;
  if (audio.skipForward(seconds)) toast(`Maju ${seconds} detik`);
  else toast("Lagu belum siap.");
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Timer lagu: lanjut otomatis saat lagu habis; file yang belum ada punya fallback. */
function updateZen(dt) {
  const zen = G.zen;
  if (!zen) return;
  zen.elapsed += dt;
  if (!zen.shown && zen.elapsed >= 6 && !G.sub) {
    zen.shown = true;
    zenNext.hidden = false;
  }
  const failed = audio.trackFailed() || (!audio.hasTrack() && zen.elapsed > 1);
  const wait = failed ? Math.min(zen.fallback, 12) : zen.fallback;

  // Sesi pendengar dan mode bebas memakai lagu loop; pesan/balasan tidak
  // menunggu lagu habis. Kaset penutup tetap lanjut saat lagu selesai.
  if (!zen.free && !zen.session && !G.sub && (audio.trackEnded() || (failed && zen.elapsed >= wait))) {
    endZen();
    return;
  }
  const pos = audio.getTrackTime();
  const label = `${formatTime(pos)}${audio.getTrackDuration() ? " / " + formatTime(audio.getTrackDuration()) : ""}`;
  if (label !== zen.timeLabel) {
    zen.timeLabel = label;
    zenTime.textContent = label;
  }
}

function showReply() {
  const listener = G.current;
  const response = G.selectedResponse;
  const cassette = G.selectedCassette;
  if (!listener || !response) return;
  const toneMatch = listener.fitTone === response.tone ? 1 : 0;
  const tapeMatch = cassette?.tags.includes(listener.mood) ? 1 : 0;
  const score = toneMatch + tapeMatch;
  G.closeness[listener.id] = score;
  saveRun();

  G.phase = "BALASAN";
  G.mode = "night";
  G.dawnTarget = 0;
  scene.setLookMode(false);
  scene.setFocus(12, -4);
  scene.setRainEase(score === 2 ? 0.72 : 1);
  audio.setRainEase(score === 2 ? 0.72 : 1);
  scene.setScreenText([listener.handle.toUpperCase(), "membalas"]);
  $("replyFrom").textContent = listener.handle.toUpperCase();
  $("replyTime").textContent = listener.clock;
  $("replyText").textContent = listener.replies[closenessKey(score)];
  showOnly(replyPanel);
  audio.sfx("message");
}

function nextAfterListener() {
  if (G.phase !== "BALASAN") return;
  const i = G.listenerIndex;
  const listener = G.current;
  saveRunProgress(i + 1);
  showOnly();
  scene.setRainEase(1);
  audio.setRainEase(1);
  if (i === 3) {
    startRainPause();
  } else if (i === 7) {
    startClosing();
  } else {
    // Kaset dipilih dulu; pesan pendengar berikutnya masuk setelah lagu mulai.
    G.listenerIndex = i + 1;
    openRack("next");
  }
  void listener;
}

function startRainPause() {
  clearPending();
  G.phase = "JEDA_HUJAN";
  G.clock = "01:00";
  G.mode = "night";
  G.listenerIndex = 4;
  scene.setFocus(0, -4);
  updateHud();
  // Lagu terakhir tetap berputar pelan; setelah monolog, pilih kaset untuk L5.
  playMonologue(
    MONOLOGUES.rainPause,
    () => openRack("next"),
    MONOLOGUES.rainPause.map((_, i) => `rain_pause_${i}`),
    "rain_pause",
  );
}

function startClosing() {
  clearPending();
  G.phase = "PENUTUPAN";
  G.clock = "05:00";
  G.mode = "night";
  G.dawnTarget = 0.5;
  G.listenerIndex = 7;
  scene.setLookMode(false);
  scene.setFocus(0, -3);
  scene.setScreenText(["SUNYI FM 91,7", "menjelang subuh"]);
  hud.classList.add("is-visible");
  updateHud();
  showOnly();
  const key = closingKey(totalCloseness());
  playMonologue(
    MONOLOGUES.closing[key],
    () => {
      G.dawnTarget = 0.78;
      openRack("closing");
    },
    MONOLOGUES.closing[key].map((_, i) => `closing_${key}_${i}`),
    `closing_${key}`,
    { timing: CLOSING_LINE_ENDS[key] },
  );
}

function finishNight() {
  clearPending();
  G.phase = "REKAP";
  G.mode = "night";
  G.zen = null;
  audio.stopMusic(3);
  scene.setPlaying(false);
  scene.setLookMode(false);
  scene.setDawn(1);
  G.dawnTarget = 1;
  G.dawnCurrent = 1;
  G.dawnDirty = false;
  hud.classList.remove("is-visible", "zen");
  showOnly(recapScreen);
  zenHud.hidden = true;
  const total = totalCloseness();
  const key = closingKey(total);
  recapTitle.textContent = RECAP_TITLES[key].title;
  recapSub.textContent = RECAP_TITLES[key].sub;
  recapGrid.innerHTML = "";
  LISTENERS.forEach((listener) => {
    const score = G.closeness[listener.id] ?? 1;
    const card = document.createElement("div");
    card.className = "recap-card";
    const name = listener.id === "L7" ? "Rani, lagi" : listener.handle;
    card.innerHTML = `<h3>${name}</h3><p>${listener.recap[closenessKey(score)]}</p>`;
    recapGrid.appendChild(card);
  });
  audio.sfx("confirm");
  const previous = readStore(META_KEY) || {};
  writeStore(META_KEY, {
    settings,
    completed: (previous.completed || 0) + 1,
    lastRecap: {
      at: Date.now(),
      total,
      variant: key,
      lines: LISTENERS.map((l) => ({ id: l.id, text: l.recap[closenessKey(G.closeness[l.id] ?? 1)] })),
    },
  });
  removeStore(RUN_KEY);
  $("continueBtn").hidden = true;
}

// ── Mode bebas ──────────────────────────────────────────────────
async function startFree() {
  await audio.start();
  applyAudioVolumes();
  clearPending();
  hideTitle();
  paused = false;
  show(pausePanel, false);
  G.mode = "free";
  G.phase = "KASET";
  G.current = null;
  G.selectedCassette = null;
  G.sessionCassette = null;
  G.selectedChannel = null;
  G.zen = null;
  G.closeness = {};
  G.played = [];
  G.dawnTarget = 0;
  G.dawnCurrent = 0;
  scene.setDawn(0);
  scene.setLookMode(false);
  hud.classList.add("is-visible");
  hud.classList.remove("zen");
  updateHud();
  openRack("free");
}

// ── Menu, jeda, pengaturan ──────────────────────────────────────
function hideTitle() {
  show(titleScreen, false);
}

function goMenu() {
  clearPending();
  paused = false;
  G.pausedFrom = null;
  G.phase = "TITLE";
  G.mode = "night";
  G.zen = null;
  cancelMonologue();
  stopSpeech();
  audio.stopMusic(1.2);
  scene.setPlaying(false);
  scene.setLookMode(false);
  scene.setFocus(0, -3);
  scene.setDawn(0);
  G.dawnTarget = 0;
  G.dawnCurrent = 0;
  G.dawnDirty = true;
  setOnAir(false);
  hud.classList.remove("is-visible", "zen");
  show(pausePanel, false);
  show(settingsPanel, false);
  show(recapScreen, false);
  showOnly();
  show(titleScreen, true);
  $("continueBtn").hidden = !readStore(RUN_KEY);
  $("startBtn").focus();
  updateHud();
}

function togglePause(force) {
  if (G.phase === "TITLE" || G.phase === "REKAP" || G.phase === "BOOT") return;
  const target = force === undefined ? !paused : force;
  if (target === paused) return;
  paused = target;
  if (paused) {
    G.pausedFrom = G.phase;
    stopSpeech();
    audio.setVoiceActive(false);
    audio.pauseMusic();
    show(pausePanel, true);
    audio.setMuffle(false);
    $("resumeBtn").focus();
  } else {
    show(pausePanel, false);
    G.pausedFrom = null;
    audio.resumeMusic();
  }
}

function applyAudioVolumes() {
  audio.setVolumes({ master: settings.master, music: settings.music, rain: settings.rain });
}

function applySettings() {
  document.body.classList.toggle("text-small", settings.text === 0);
  document.body.classList.toggle("text-large", settings.text === 2);
  document.body.classList.toggle("subs-off", !settings.subtitle);
  scene?.setQuality(settings.quality);
  if (scene) scene.reduceMotion = settings.reduce;
  audio.setReduceMotion(settings.reduce);
  applyAudioVolumes();
  audio.setVoiceActive(settings.voice && !!G.sub);

  $("volMaster").value = settings.master;
  $("volMusic").value = settings.music;
  $("volRain").value = settings.rain;
  $("subtitleToggle").checked = settings.subtitle;
  $("reduceToggle").checked = settings.reduce;
  $("voiceToggle").checked = settings.voice;
  document.querySelectorAll("#textSizeSeg button").forEach((b) => b.classList.toggle("active", Number(b.dataset.v) === settings.text));
  document.querySelectorAll("#qualitySeg button").forEach((b) => b.classList.toggle("active", b.dataset.v === settings.quality));
}

function saveSettings() {
  const previous = readStore(META_KEY) || {};
  writeStore(META_KEY, { ...previous, settings });
  $("continueBtn").hidden = !readStore(RUN_KEY);
}

function openSettings() {
  applySettings();
  show(settingsPanel, true);
  $("settingsClose").focus();
}

function closeSettings() {
  show(settingsPanel, false);
  saveSettings();
  if (paused) $("resumeBtn").focus();
}

// ── Simpan progres ──────────────────────────────────────────────
function saveRun() {
  if (G.mode === "free" || G.phase === "TITLE" || G.phase === "REKAP") return;
  writeStore(RUN_KEY, {
    listenerIndex: G.listenerIndex,
    closeness: G.closeness,
    played: G.played,
    clock: G.clock,
    sessionCassette: G.sessionCassette?.id || null,
  });
}

function saveRunProgress(nextIndex) {
  writeStore(RUN_KEY, {
    listenerIndex: nextIndex,
    closeness: G.closeness,
    played: G.played,
    clock: LISTENERS[Math.min(nextIndex, 7)]?.clock || "05:00",
  });
}

// ── Alur awal ───────────────────────────────────────────────────
async function beginNight(resume = false) {
  await audio.start();
  applyAudioVolumes();
  audio.resume();
  clearPending();
  hideTitle();
  show(pausePanel, false);
  show(settingsPanel, false);
  paused = false;
  show(recapScreen, false);
  scene.setDawn(0);
  G.dawnTarget = 0;
  G.dawnCurrent = 0;
  G.dawnDirty = true;
  resetMixer();
  if (!resume) {
    enterOpening();
    return;
  }
  const run = readStore(RUN_KEY);
  if (!run || run.listenerIndex == null || run.listenerIndex >= 8) {
    enterOpening();
    return;
  }
  G.closeness = run.closeness || {};
  G.played = run.played || [];
  G.sessionCassette = CASSETTES.find((c) => c.id === run.sessionCassette) || null;
  enterListener(run.listenerIndex);
}

function resetMixer() {
  for (const [name, value] of Object.entries({ music: 0.7, glass: 0.5, far: 0.4, warm: 0.5 })) {
    audio.setFader(name, value);
    scene.setFaderValue(name, value);
  }
  audio.setWarm(0.5);
}

// ── Render loop ─────────────────────────────────────────────────
let last = performance.now();

function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;

  if (scene) {
    scene.update(dt);
    if (!paused) {
      // Timer cerita memakai waktu nyata agar tetap akurat di komputer lambat,
      // tetapi dibatasi supaya tidak melompat setelah tab lama tidak aktif.
      const storyDt = Math.min(0.25, raw);
      tickPending(storyDt * 1000);
      updateZen(storyDt);
      if (G.sub) audio.updateDucking();
      if (G.dawnCurrent !== G.dawnTarget) {
        G.dawnCurrent += (G.dawnTarget - G.dawnCurrent) * Math.min(1, dt * 0.55);
        if (Math.abs(G.dawnCurrent - G.dawnTarget) < 0.002) G.dawnCurrent = G.dawnTarget;
        scene.setDawn(G.dawnCurrent);
      }
      trackFps(dt);
    }
    scene.setAudioLevel(audio.getLevel());
    scene.render();
  }
  requestAnimationFrame(frame);
}

let lowCount = 0;
function trackFps(dt) {
  if (qualityLocked) return;
  fpsAccum += dt;
  fpsFrames += 1;
  if (fpsAccum < 2.5) return;
  const fps = fpsFrames / fpsAccum;
  fpsAccum = 0;
  fpsFrames = 0;
  if (fps < 28 && settings.quality !== "low") {
    lowCount += 1;
    if (lowCount >= 3) {
      settings.quality = "low";
      scene.setQuality("low");
      applySettings();
      saveSettings();
      toast("Kualitas grafis diturunkan agar tetap tenang.");
      lowCount = 0;
      lowFpsTime = 0;
    }
  } else {
    lowCount = 0;
  }
  void lowFpsTime;
}

function fitStage() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const x = (window.innerWidth - 1920 * s) / 2;
  const y = (window.innerHeight - 1080 * s) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

let warnDismissed = false;

function checkPlatform() {
  if (warnDismissed) {
    pcWarning.hidden = true;
    if (G.phase === "TITLE") show(titleScreen, true);
    return true;
  }
  const tooNarrow = window.innerWidth < 1280;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const warn = tooNarrow || coarse;
  pcWarning.hidden = !warn;
  if (!warn && G.phase === "TITLE") {
    show(titleScreen, true);
  }
  return !warn;
}

// ── Tooltip mixer ───────────────────────────────────────────────
function mixerTip(name) {
  if (!name) {
    hoverTip.hidden = true;
    return;
  }
  const value = scene.faderValues[name];
  hoverTip.textContent = `${CHANNELS[name]} · ${value.toFixed(2)}`;
  hoverTip.hidden = false;
}

// ── Peristiwa ───────────────────────────────────────────────────
function bindUi() {
  $("startBtn").addEventListener("click", () => beginNight(false));
  $("continueBtn").addEventListener("click", () => beginNight(true));
  $("freeBtn").addEventListener("click", () => startFree());
  $("msgNext").addEventListener("click", showResponses);
  $("replyNext").addEventListener("click", nextAfterListener);
  $("subSkip").addEventListener("click", advanceSubtitle);
  zenSkip.addEventListener("click", skipCurrentTrack);
  zenFf.addEventListener("click", () => fastForwardTrack(30));
  $("zenNext").addEventListener("click", () => {
    if (G.phase === "BEBAS") togglePause(true);
    else endZen();
  });
  $("settingsBtn").addEventListener("click", openSettings);
  $("titleSettings").addEventListener("click", openSettings);
  $("settingsClose").addEventListener("click", closeSettings);
  $("pauseSettings").addEventListener("click", openSettings);
  $("resumeBtn").addEventListener("click", () => togglePause(false));
  $("pauseMenu").addEventListener("click", goMenu);
  $("recapAgain").addEventListener("click", async () => {
    await beginNight(false);
  });
  $("recapMenu").addEventListener("click", goMenu);
  $("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  $("ignoreWarnBtn")?.addEventListener("click", () => {
    warnDismissed = true;
    checkPlatform();
  });

  // Pengaturan
  const bindRange = (id, key) => {
    $(id).addEventListener("input", (e) => {
      settings[key] = Number(e.target.value);
      applyAudioVolumes();
    });
  };
  bindRange("volMaster", "master");
  bindRange("volMusic", "music");
  bindRange("volRain", "rain");
  $("subtitleToggle").addEventListener("change", (e) => {
    settings.subtitle = e.target.checked;
    applySettings();
    saveSettings();
  });
  $("reduceToggle").addEventListener("change", (e) => {
    settings.reduce = e.target.checked;
    applySettings();
    saveSettings();
  });
  $("voiceToggle").addEventListener("change", (e) => {
    settings.voice = e.target.checked;
    if (settings.voice && !voice) {
      pickVoice();
      if (!voice) toast("Suara Indonesia belum tersedia di browser ini.");
    }
    applySettings();
    saveSettings();
  });
  document.querySelectorAll("#textSizeSeg button").forEach((b) =>
    b.addEventListener("click", () => {
      settings.text = Number(b.dataset.v);
      applySettings();
      saveSettings();
    }),
  );
  document.querySelectorAll("#qualitySeg button").forEach((b) =>
    b.addEventListener("click", () => {
      settings.quality = b.dataset.v;
      qualityLocked = true;
      applySettings();
      saveSettings();
    }),
  );

  // Mixer
  scene.listeners.onFader = (name, value) => {
    audio.setFader(name, value);
    if (name === "warm") audio.setWarm(value);
    if (hoverTip.hidden) {
      hoverTip.textContent = `${CHANNELS[name]} · ${value.toFixed(2)}`;
      hoverTip.hidden = false;
    } else {
      hoverTip.textContent = `${CHANNELS[name]} · ${value.toFixed(2)}`;
    }
  };
  scene.listeners.onHover = (name, x, y, value, label) => {
    if (!name) {
      hoverTip.hidden = true;
      return;
    }
    hoverTip.textContent = label || `${CHANNELS[name]} · ${Number(value).toFixed(2)}`;
    hoverTip.style.left = `${x}px`;
    hoverTip.style.top = `${y}px`;
    hoverTip.hidden = false;
    audio.sfx("hover");
  };
  scene.listeners.onAction = (name, label) => {
    audio.sfx(name === "curtain" ? "curtain" : name === "mug" ? "mug" : "switch");
    toast(label, 1700);
  };
  let camYaw = 1e3;
  let camPitch = 1e3;
  scene.onCamera((yaw, pitch) => {
    if (Math.abs(yaw - camYaw) < 0.5 && Math.abs(pitch - camPitch) < 0.5) return;
    camYaw = yaw;
    camPitch = pitch;
    audio.setCamera(yaw, pitch);
  });

  // Papan ketik
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("click", (e) => {
    if (e.detail > 0) e.target.closest("button")?.blur();
  });
  window.addEventListener("resize", () => {
    fitStage();
    scene.resize();
    checkPlatform();
  });
  document.addEventListener("visibilitychange", () => audio.setHidden(document.hidden));
  window.addEventListener("blur", () => audio.setMuffle(false));
}

function onKeyDown(e) {
  if (pcWarning.hidden === false) return;
  const active = document.activeElement;
  if (active && active.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter")) return;

  if (e.key === "Escape") {
    if (!settingsPanel.hidden) {
      closeSettings();
      return;
    }
    if (G.phase === "TITLE" || G.phase === "REKAP") return;
    togglePause();
    return;
  }

  if (e.code === "KeyC" && !e.repeat) {
    if (G.phase !== "TITLE" && G.phase !== "BOOT") audio.setMuffle(true);
    return;
  }

  if (paused) return;

  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (G.sub) advanceSubtitle();
    else if (G.phase === "PESAN") showResponses();
    else if (G.phase === "BALASAN") nextAfterListener();
    else if ((G.phase === "ZEN" || G.phase === "BEBAS") && G.zen?.shown) {
      if (G.phase === "BEBAS") togglePause(true);
      else endZen();
    }
    return;
  }

  if (G.phase === "RESPONS" && ["1", "2", "3"].includes(e.key)) {
    const idx = Number(e.key) - 1;
    const r = G.current?.responses[idx];
    if (r) chooseResponse(r);
    return;
  }

  if ((e.code === "KeyN" || e.code === "KeyS") && (G.phase === "ZEN" || G.phase === "BEBAS")) {
    e.preventDefault();
    skipCurrentTrack();
    return;
  }

  if ((G.phase === "ZEN" || G.phase === "BEBAS") && ["1", "2", "3", "4"].includes(e.key)) {
    const name = ["music", "glass", "far", "warm"][Number(e.key) - 1];
    G.selectedChannel = name;
    toast(`${CHANNELS[name]} · ${scene.faderValues[name].toFixed(2)} — panah kiri/kanan`, 1800);
    return;
  }

  if ((G.phase === "ZEN" || G.phase === "BEBAS") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    const name = G.selectedChannel || "music";
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const value = Math.min(1, Math.max(0, scene.faderValues[name] + dir * 0.05));
    scene.setFaderValue(name, value);
    audio.setFader(name, value);
    if (name === "warm") audio.setWarm(value);
    toast(`${CHANNELS[name]} · ${value.toFixed(2)}`, 1200);
    return;
  }

  if (G.phase === "BEBAS" && e.code === "KeyR") {
    skipCurrentTrack();
  }
}

function onKeyUp(e) {
  if (e.code === "KeyC") audio.setMuffle(false);
}

// ── Mulai ───────────────────────────────────────────────────────
function boot() {
  fitStage();
  const ok = checkPlatform();
  scene = new SceneRig($("scene"), { quality: settings.quality });
  scene.reduceMotion = settings.reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  audio.setReduceMotion(scene.reduceMotion);
  audio.onThunder = () => scene.flashLightning();
  audio.onTrackError = (cassette) => toast(`Lagu "${cassette.title}" belum ada di public/music.`);
  applySettings();
  bindUi();

  if (import.meta.env.DEV) {
    globalThis.__ps = { G, scene, audio, enterListener, chooseResponse, chooseCassette, showReply, startRainPause, startClosing, finishNight, showResponses, CASSETTES, LISTENERS };
  }

  // Nilai awal scene
  for (const [name, value] of Object.entries({ music: 0.7, glass: 0.5, far: 0.4, warm: 0.5 })) {
    scene.setFaderValue(name, value);
  }

  const run = readStore(RUN_KEY);
  $("continueBtn").hidden = !run || run.listenerIndex == null || run.listenerIndex >= 8;

  G.phase = "TITLE";
  G.mode = "night";
  scene.setFocus(0, -3);
  scene.setScreenText(["SUNYI FM 91,7", "teman jaga"]);
  show(titleScreen, ok);
  hud.classList.remove("is-visible");

  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

boot();
