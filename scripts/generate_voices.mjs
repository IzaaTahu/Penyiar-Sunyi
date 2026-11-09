import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MONOLOGUES, LISTENERS } from "../src/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/voices");

// Ambil argument CLI
const args = process.argv.slice(2);
function getArg(name) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

const API_KEY = getArg("key") || process.env.ELEVENLABS_API_KEY;
const VOICE_ID = getArg("voice") || process.env.ELEVENLABS_VOICE_ID;
const ONLY = getArg("only"); // e.g. "opening", "rain", "closing", "L1", etc.
const OVERWRITE = args.includes("--overwrite");
const LIST_ONLY = args.includes("--list");
const PER_LINE = args.includes("--per-line");

const items = [];

if (PER_LINE) {
  // Mode per-kalimat (78 file)
  MONOLOGUES.opening.forEach((text, i) => {
    items.push({ id: `opening_${i}`, category: "opening", file: `opening_${i}.mp3`, text });
  });
  MONOLOGUES.rainPause.forEach((text, i) => {
    items.push({ id: `rain_pause_${i}`, category: "rain", file: `rain_pause_${i}.mp3`, text });
  });
  for (const [variant, lines] of Object.entries(MONOLOGUES.closing)) {
    lines.forEach((text, i) => {
      items.push({ id: `closing_${variant}_${i}`, category: "closing", file: `closing_${variant}_${i}.mp3`, text });
    });
  }
  LISTENERS.forEach((l) => {
    l.responses.forEach((r) => {
      r.lines.forEach((text, i) => {
        items.push({
          id: `${l.id}_${r.id}_${i}`,
          category: l.id,
          file: `${l.id}_${r.id}_${i}.mp3`,
          text,
          listener: l.handle,
          tone: r.tone,
        });
      });
    });
  });
} else {
  // Mode gabungan per-segmen (29 file) — SANGAT DISARANKAN untuk mood & emosi ElevenLabs!
  items.push({
    id: "opening",
    category: "opening",
    file: "opening.mp3",
    text: MONOLOGUES.opening.join("\n"),
  });
  items.push({
    id: "rain_pause",
    category: "rain",
    file: "rain_pause.mp3",
    text: MONOLOGUES.rainPause.join("\n"),
  });
  for (const [variant, lines] of Object.entries(MONOLOGUES.closing)) {
    items.push({
      id: `closing_${variant}`,
      category: "closing",
      file: `closing_${variant}.mp3`,
      text: lines.join("\n"),
    });
  }
  LISTENERS.forEach((l) => {
    l.responses.forEach((r) => {
      items.push({
        id: `${l.id}_${r.id}`,
        category: l.id,
        file: `${l.id}_${r.id}.mp3`,
        text: r.lines.join("\n"),
        listener: l.handle,
        tone: r.tone,
        label: r.label,
      });
    });
  });
}

if (LIST_ONLY) {
  console.log(`\n=== DAFTAR SEMUA DIALOG (${items.length} file) ===\n`);
  items.forEach((item, idx) => {
    console.log(`[${idx + 1}/${items.length}] ${item.file}`);
    console.log(item.text.split("\n").map((line) => `    "${line}"`).join("\n"));
    console.log("");
  });
  process.exit(0);
}

if (!API_KEY || !VOICE_ID) {
  console.log(`
==============================================================
Penyiar Sunyi — Generator Suara ElevenLabs
==============================================================

Mode default: GABUNGAN PER-SEGMEN (29 file).
Satu paragraf utuh di-generate sekaligus sehingga intonasi,
jeda napas, dan mood emosionalnya jauh lebih natural!

Gunakan script ini untuk generate otomatis:
  node scripts/generate_voices.mjs --key=ELEVENLABS_API_KEY --voice=VOICE_ID

Opsi tambahan:
  --only=opening      Hanya generate opening.mp3 (1 file tes)
  --only=L1           Hanya generate pendengar L1 (3 opsi respon)
  --per-line          Generate per-kalimat (78 file terpisah)
  --overwrite         Timpa file yang sudah ada
  --list              Tampilkan daftar file dan kalimat teks lengkap

Atau kamu juga bisa men-download file .mp3 secara manual dari
dashboard ElevenLabs dan letakkan di folder:
  public/voices/
==============================================================
`);
  process.exit(0);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const targets = ONLY ? items.filter((it) => it.category === ONLY || it.id.startsWith(ONLY)) : items;

console.log(`Menyiapkan ${targets.length} file suara menggunakan Voice ID: ${VOICE_ID}...`);

async function generateLine(item) {
  const dest = path.join(OUT_DIR, item.file);
  if (fs.existsSync(dest) && !OVERWRITE) {
    console.log(`[SKIP] ${item.file} sudah ada.`);
    return;
  }

  console.log(`[GEN] Menghasilkan ${item.file} (${item.text.length} karakter)...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: item.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(arrayBuffer));
  console.log(`[OK] Disimpan ke ${dest}`);
}

async function main() {
  let done = 0;
  for (const item of targets) {
    try {
      await generateLine(item);
      done++;
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`[ERROR] Gagal generate ${item.file}:`, err.message);
    }
  }
  console.log(`\nSelesai! Berhasil memproses ${done} file ke folder public/voices/\n`);
}

main();
