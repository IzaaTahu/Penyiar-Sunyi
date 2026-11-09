# Aset

Proyek ini tidak memakai tekstur, model, atau gambar eksternal. Semua visual dibuat secara prosedural di browser. Audio memakai campuran suara prosedural dan berkas `.mp3` yang diisi sendiri.

## Audio

Dibuat di `src/audio.js` dengan Web Audio API:

- **Hujan kaca** — noise putih dan pink yang difilter bandpass/lowpass, ditambah tetesan acak ber-pan.
- **Hujan jauh** — noise brown lowpass dan desis kota.
- **Ruang** — dengung listrik 50/100 Hz dan udara rendah.
- **Petir** — noise brown dengan lowpass yang turun, sesekali, dengan kilat visual.
- **Lagu kaset** — berkas `.mp3` dari `public/music/`, diputar lewat `<audio>` + `MediaElementSource` dan masuk ke bus musik (EQ hangat, lowpass, gain, compressor). Volume musik 1,25; hujan kaca 0,28; hujan jauh 0,22; VO 1,3.
- **Ducking** — saat penyiar bicara, bus musik meredup ke 55% di bagian instrumental (intro/interlude/outro) atau 28% saat vokal penyanyi sedang berjalan, dalam 0,5 detik, lalu naik kembali dalam 1,2 detik. Musik tetap terdengar sebagai backsound, tidak menutupi VO.
- **Cue vokal** — `cues.intro`, `cues.interlude`, `cues.outro` di `src/data.js` menandai bagian instrumental; penyiar hanya memulai bicara di intro lagu.
- **Efek UI** — klik, konfirmasi, kaset masuk, eject, pesan, ON AIR.
- **Mixer** — empat kanal (Lagu, Hujan Kaca, Hujan Jauh, Hangat) dengan filter dan low shelf; posisi kamera memengaruhi keseimbangan suara.

## Visual

Dibuat di `src/scene.js` dengan Three.js:

- Ruang penyiar, meja, mixer, tape deck, CRT, lampu, rak, cangkir, headphone, buku catatan, jam, dan papan ON AIR.
- Kota malam di luar jendela, lampu jendela, mobil yang lewat, dan kabut.
- Hujan partikel di luar, tetesan di kaca, dan shader refraksi layar.
- Semua material, geometri, dan tekstur (glow, layar CRT, noise) dibuat dari kode.

UI memakai HTML/CSS/SVG inline. Ikon antarmuka adalah SVG yang ditulis langsung di `index.html` dan `src/main.js`.

## Font

- **Lora** (400, 400 italic, 500) — `@fontsource/lora`, subset latin.
- **DM Sans** (400, 500) — `@fontsource/dm-sans`, subset latin.

Keduanya dibundel lewat npm, bukan diambil dari CDN.

## Suara penyiar

Rekaman opsional di `public/voices/` (lihat [VOICES.md](VOICES.md)). Berkas diputar lewat bus VO (gain 1,3) dan memicu ducking musik. Bila rekaman tidak ada, browser memakai `speechSynthesis` atau subtitle saja.
