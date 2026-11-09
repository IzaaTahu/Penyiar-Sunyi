# PRD Penyiar Sunyi v2.0

**Dokumen Spesifikasi Produk**, Versi 2.0 (revisi dari Versi 1.0) **Platform:** PC (browser desktop). Tanpa mobile dan layar sentuh. **Teknologi utama:** Three.js, WebGL2, JavaScript (ES6+ modules), Web Audio API, HTML5, CSS3, SVG **Genre:** Slice-of-life, simulator audio-visual, zen dan healing, naratif interaktif **Fokus pengalaman:** Atmosfer mellow, chill, dan ASMR hujan malam hari

## 0. Catatan Revisi v2.0

| No | Masalah di v1.0 | Perbaikan di v2.0 | Bagian |
| --- | --- | --- | --- |
| 1 | Loop belum punya makna dan arc: pilihan respons dan kaset tidak punya akibat, dan tidak ada struktur malam. | Satu malam siaran dengan 8 pendengar, Jeda Hujan di tengah, dan penutup saat subuh. Sistem Kedekatan menentukan balasan, callback, dan epilog tanpa skor yang terlihat. | 4, 6, 7 |
| 2 | Voice over belum dihitung (jumlah, ukuran, proses, lisensi). | Anggaran 29 klip (sekitar 20 menit), pengolahan offline dengan satu preset, uji prototipe di M0, subtitle selalu ada, dan aturan lisensi. | 11, 17, 19 |
| 3 | Hujan di kaca dengan partikel akan terlihat datar. | Shader tetesan yang membiaskan kota lewat render target beresolusi rendah, embun lewat noise, partikel hanya untuk hujan di luar. | 9 |
| 4 | Detail audio teknis belum ada (memori, streaming, loop, unlock, pemetaan kamera ke audio). | Graf Web Audio lengkap, musik di-stream, loop mulus, tombol Mulai, dan tabel pemetaan kamera ke audio. | 8, 11 |
| 5 | Panel pesan SVG murni kurang pas untuk teks. | Teks berupa HTML dengan bingkai dan ikon SVG. Kursor dan indikator tetap SVG murni. | 10 |
| 6 | Platform, bahasa, jumlah konten, penyimpanan, kontrol, dan lisensi musik belum ditentukan. | PC saja, bahasa Indonesia, angka konten, localStorage, tabel kontrol, dan aturan lisensi. | 3, 7, 12, 14, 17 |

## 1. Ringkasan Eksekutif

“Penyiar Sunyi” adalah game simulasi naratif berbasis browser. Pemain menjadi penyiar radio lokal di shift larut malam, duduk di meja siaran yang menghadap jendela berhujan. Satu malam siaran berisi delapan pendengar. Untuk tiap pendengar, pemain membaca pesan mereka, memilih respons yang dibacakan sebagai monolog bersuara, memilih kaset lagu yang paling pas, lalu menikmati lagu sambil menyetel mixer antara musik dan hujan. Tidak ada game over dan tidak ada skor yang terlihat. Yang berubah hanya kedekatan antara penyiar dan pendengarnya, yang menentukan balasan, kabar lanjutan, dan nada subuh di akhir malam. Intinya adalah rasa ditemani di tengah kelelahan yang tenang.

## 2. Tujuan dan Prinsip

- **Pengalaman emosional.** Menghadirkan rasa ditemani di tengah kesepian malam dan menangkap esensi “murung capek”: lelah dengan rutinitas, tetapi damai.
- **Sinkronisasi audio-visual.** Mekanik Web Audio API menyatu dengan elemen 3D (fader, knob, kaset, hujan di kaca) agar interaksi terasa fisik.
- **Estetika minimalis dan elegan.** UI bersih dan tajam, tanpa emoji dan tanpa gangguan visual komedi.
- **Tanpa kegagalan.** Tidak ada game over, skor, atau jawaban yang salah.
- **Audio sebagai nyawa.** Kualitas suara diutamakan di atas jumlah fitur.

## 3. Platform dan Layar (khusus PC)

| Aspek | Keputusan |
| --- | --- |
| Browser | Chrome, Edge, Firefox, dan Safari versi stabil terbaru dan satu versi sebelumnya. WebGL2 wajib. |
| Perangkat | PC atau laptop. Target 60 fps di perangkat menengah, minimal 30 fps pada Kualitas Rendah di GPU terintegrasi. |
| Resolusi desain | 1920 x 1080 (16:9). Minimum 1366 x 768. |
| Tanpa mobile | Tidak ada layout ponsel atau tablet dan tidak ada kontrol sentuh. Pada perangkat sentuh atau jendela lebih sempit dari 1280 piksel tampil pesan “Game ini dimainkan di PC”. |
| Skala | Canvas 3D mengisi jendela dengan FOV vertikal tetap. UI berada di panggung 1920 x 1080 yang diskalakan seragam dan dipusatkan, dengan bar di tepi untuk rasio di luar 16:10 sampai 21:9. |
| Layar penuh | Tombol di pengaturan dan F11. |
| Input | Mouse dan keyboard. Gamepad tidak didukung. |
| Audio | Layar judul menyarankan headphone untuk pengalaman ASMR. Mix tetap nyaman di speaker. |
| Jaringan | Setelah dimuat, berjalan offline. |

## 4. Struktur Satu Malam

Satu permainan adalah satu malam siaran (sekitar 35 sampai 45 menit). Jam dinding di ruang siaran maju per segmen, bukan per detik.

| Segmen | Jam siaran | Isi |
| --- | --- | --- |
| Pembukaan | 22:00 | Monolog pembuka Penyiar (bersuara), lalu pemain memilih kaset pembuka (bebas, tanpa penilaian). |
| Pendengar 1 sampai 4 | 22:30 sampai 00:30 | Siklus pesan, respons, kaset, dan lagu. |
| Jeda Hujan | 01:00 | Monolog tengah Penyiar, lalu segmen zen sekitar 3 menit tanpa pesan (hanya mixer dan kamera). |
| Pendengar 5 sampai 7 | 01:30 sampai 03:30 | Pendengar 7 adalah kabar lanjutan dari Rani. |
| Pendengar 8 | 04:00 | Pendengar Tetap, yang menyapa Penyiar. |
| Penutupan | 05:00 | Monolog penutup (tiga varian), kaset penutup, fajar di jendela, dan Rekap Siaran. |

Setelah malam pertama selesai, pemain bisa mengulang malam untuk mendengar varian lain. **Ruang Siaran Bebas** (tanpa pesan, hanya memilih kaset dan menyetel mixer) tersedia dari menu judul sejak awal untuk pemain yang hanya ingin suasana hujan.

## 5. Core Loop per Pendengar

1. **Pesan masuk.** Mesin faks mencetak atau monitor CRT menampilkan pesan teks. Kamera berpindah halus ke layar. Pemain membaca dengan kecepatan sendiri lalu menekan Lanjut.
2. **Respons.** Muncul tiga pilihan (A, B, C) dengan nada berbeda: Menemani, Menenangkan, atau Mendorong. Memilih salah satu memicu monolog Penyiar bersuara sekitar 30 sampai 45 detik dengan subtitle. Lampu ON AIR menyala selama monolog.
3. **Kurasi kaset.** Rak berisi 10 kaset. Hover menampilkan judul dan gaya. Klik membuat kaset terbang ke tape deck dengan animasi masuk, lalu tombol play ditekan otomatis.
4. **Mode Zen.** Saat lagu diputar, UI memudar. Pemain menyetel mixer (bagian 8) dan melihat sekeliling dengan kamera terbatas. Tombol Lanjut muncul samar setelah 60 detik, dan lagu juga bisa dibiarkan sampai selesai.
5. **Balasan.** Pendengar mengirim balasan singkat di layar. Isi balasan bergantung pada seberapa selaras respons dan kaset (bagian 6).
6. **Berikutnya.** Jam dinding maju dan pesan pendengar berikutnya masuk.

## 6. Sistem Respons dan Kedekatan

- **Nada respons:** Menemani (mengakui dan hadir), Menenangkan (menurunkan ketegangan), dan Mendorong (menyemangati pelan).
- **Mood pendengar:** lelah, rindu, cemas, sepi, ragu, atau hampa. Tiap pendengar punya satu mood dan satu nada yang paling cocok. Tiap kaset punya dua tag mood.
- **Selaras:** respons yang nadanya cocok bernilai 1, kaset yang tagnya cocok bernilai 1. Hasilnya 0 sampai 2 dan **tidak pernah ditampilkan sebagai angka**.
- **Akibat langsung:** balasan pendengar punya tiga versi (hangat untuk 2, biasa untuk 1, tenang untuk 0). Semuanya sopan dan tidak menghakimi. Pada selaras 2, hujan di kaca mereda sedikit.
- **Kedekatan:** tiap pendengar menyimpan nilai kedekatan 0 sampai 2 dari selaras. Total kedekatan (0 sampai 16) dipakai untuk tiga hal: nada pesan Pendengar 7, isi Rekap Siaran, dan varian monolog penutup (rendah 0 sampai 6, sedang 7 sampai 11, tinggi 12 sampai 16).
- **Tanpa penghakiman.** Tidak ada pilihan yang salah, hanya nada subuh yang berbeda.

## 7. Konten

### 7.1 Penyiar

Nama udara “Sunyi”, stasiun Sunyi FM 91,7, acara “Teman Jaga”. Penyiar adalah orang dewasa yang diam-diam sama lelahnya dengan pendengarnya. Tiga monolog (pembuka, Jeda Hujan, penutup) membentuk arc dari “capek yang disembunyikan” menjadi “boleh capek bersama”. Tidak ada kalimat motivasi klise.

### 7.2 Delapan Pendengar

| No | Pendengar | Topik | Mood | Nada paling cocok | Kaset cocok |
| --- | --- | --- | --- | --- | --- |
| 1 | Rani (26) | Lembur terus dan merasa tak ada artinya | lelah | Menemani | K1, K3, K7 |
| 2 | Dito (31) | Perantau yang belum pulang tiga lebaran | rindu | Menenangkan | K1, K2, K9 |
| 3 | Bu Maya (52) | Tak bisa tidur sejak pensiun | sepi | Menemani | K2, K4, K5, K8 |
| 4 | Nadia (22) | Overthinking soal skripsi dan masa depan | cemas | Menenangkan | K4, K6, K7 |
| 5 | “Kopi Hitam” (anonim) | Ingin berhenti kerja tetapi takut | ragu | Mendorong | K6, K9 |
| 6 | Pak Danu (45) | Sopir truk yang mendengarkan dari jalan dan kangen anak | rindu | Mendorong | K1, K2, K9 |
| 7 | Rani (kembali) | Kabar setelah malam pertama, nadanya berubah menurut kedekatan | ragu | Mendorong | K6, K9 |
| 8 | Pendengar Tetap (anonim) | Mengucap terima kasih dan bertanya “kamu sendiri sudah baik-baik saja?” | hampa | Menemani | K3, K5, K8 |

### 7.3 Sepuluh Kaset

| Kode | Judul | Gaya | Tag mood |
| --- | --- | --- | --- |
| K1 | Teh Hangat | Acoustic Mellow | lelah, rindu |
| K2 | Pulang Pelan | Acoustic Mellow | rindu, sepi |
| K3 | Lampu Kota | Lo-Fi | lelah, hampa |
| K4 | Jam Tiga Pagi | Lo-Fi | cemas, sepi |
| K5 | Hujan di Atap Seng | Post-Rock Ambient | sepi, hampa |
| K6 | Langit Setelah Hujan | Post-Rock Ambient | ragu, cemas |
| K7 | Selimut | Piano Ambient | cemas, lelah |
| K8 | Stasiun Kosong | Ambient | hampa, sepi |
| K9 | Jalan Pulang | Acoustic | rindu, ragu |
| K10 | Subuh | Ambient akustik | Tanpa tag. Dipakai sebagai kaset penutup dan boleh dipilih kapan saja. |

### 7.4 Rekap Siaran

Di akhir malam, tiap pendengar mengirim satu kalimat penutup. Ada tiga versi per pendengar menurut kedekatan, ditampilkan sebagai kartu tanpa angka. Rekap bisa dibuka lagi dari menu.

## 8. Mixer dan Mode Zen

| Kontrol | Rentang (bawaan) | Efek audio | Efek visual |
| --- | --- | --- | --- |
| Fader Lagu | 0 sampai 1 (0,7) | Gain bus musik dengan kurva eksponensial | Lampu LED VU di mixer |
| Fader Hujan Kaca | 0 sampai 1 (0,5) | Gain loop hujan di kaca | Kepadatan dan kecepatan tetesan di jendela |
| Fader Hujan Jauh | 0 sampai 1 (0,4) | Gain hujan atap dan jauh, serta frekuensi petir | Kabut kota dan kilat jauh |
| Knob Hangat | 0 sampai 1 (0,5) | Low-shelf -4 sampai +4 dB dan high-shelf 0 sampai -6 dB pada musik | Warna lampu meja sedikit lebih hangat |

**Kamera di Mode Zen.** Yaw dibatasi 70 derajat ke kiri dan kanan, pitch dari -25 sampai +20 derajat. Arah pandang memengaruhi suara:

| Arah pandang | Hujan kaca | Hujan jauh | Musik |
| --- | --- | --- | --- |
| Menghadap jendela (yaw dalam 15 derajat) | 0 dB, filter terbuka | 0 dB | 0 dB |
| Menoleh ke samping (yaw 40 sampai 70 derajat) | -6 dB, low-pass 3 kHz | -3 dB | -2 dB, low-pass 5 kHz |
| Menunduk ke meja (pitch di bawah -15 derajat) | -9 dB, low-pass 2 kHz | -6 dB | 0 dB (terdengar dekat dari tape deck) |

**Tutup telinga.** Menahan tombol C meredam bus musik dan hujan dengan low-pass ke 700 Hz dalam 400 milidetik. Melepasnya mengembalikan suara. Suara Penyiar tidak ikut diredam.

Perpindahan nilai di atas selalu di-smooth (sekitar 300 milidetik) agar tidak ada lonjakan suara.

## 9. Visual dan Ruang Siaran

- **Ruang.** Meja siaran dengan mikrofon, mixer, tape deck, rak kaset, mesin faks atau monitor CRT, lampu meja, lampu ON AIR, cangkir kopi (uap halus), jam dinding, buku catatan, dan headphone. Jendela kaca besar di depan meja.
- **Pencahayaan.** Redup dan moody. Sumber utama lampu meja kuning hangat, lampu LED mixer (merah dan hijau, emissive), dan pantulan lampu jalan dari luar. Paling banyak tiga cahaya dinamis, sisanya dibakar (ambient occlusion di vertex color) dan emissive. Bloom ringan hanya pada preset Sedang ke atas.
- **Hujan di kaca.** Memakai shader tetesan: tetesan diam dan tetesan yang mengalir, membiaskan pemandangan kota yang dirender ke render target beresolusi rendah dan di-blur satu kali. Embun dibuat dari noise dengan mask. Partikel hanya dipakai untuk hujan di luar jendela. Opsional (P2): pemain mengusap embun dengan mouse.
- **Kota.** Bangunan low-poly ber-instancing dengan jendela menyala yang berkedip pelan, lampu jalan, sesekali lampu kendaraan, dan lapisan kabut. Kilat jauh sinkron dengan petir tetapi dibatasi redup dan jarang (lihat aksesibilitas).
- **Interaksi objek.** Raycaster untuk kaset, fader, knob, dan layar. Objek yang bisa diklik berpendar halus dan memunculkan label singkat saat di-hover.

| Pengaturan | Rendah | Sedang | Tinggi |
| --- | --- | --- | --- |
| Pixel ratio | 1 | 1,25 | sampai 2 |
| Skala render target kaca | 0,25 | 0,5 | 0,75 |
| Tetesan di kaca | 150 | 300 | 500 |
| Bloom | Mati | Ringan | Ringan |
| Bayangan | Mati | Satu, kecil | Satu, sedang |

Bila rata-rata fps di bawah 30 selama 5 detik, kualitas turun satu tingkat dan pemain ditawari mengunci pilihan itu.

## 10. UI dan Tipografi

- **Struktur.** Canvas WebGL di bawah dan overlay DOM di atasnya. Teks pesan, pilihan respons, dan subtitle berupa HTML. Bingkai, ikon, kursor, dan indikator kaset berupa SVG buatan khusus. Bila pesan harus tampil di monitor CRT 3D, dipakai `CanvasTexture` dengan teks yang sama.
- **Gaya.** Bersih, elegan, bernuansa malam. Tanpa emoji.
- **Font** (berlisensi terbuka, di-host sendiri dalam woff2): Lora untuk pesan dan subtitle, DM Sans untuk HUD dan menu.
- **Token warna:** `--night-900` #0E1220, `--night-700` #1B2238, `--amber-300` #F2C27A (lampu meja), `--amber-200` #F7DDB0 (teks hangat), `--teal-300` #7FB8B0 (LED hijau), `--rose-300` #D98C8C (LED merah), `--text` #ECE6DA, `--muted` #9AA3B8. Kontras teks dijaga minimal 4,5 banding 1.

**Aksesibilitas.**

- Subtitle monolog selalu tampil (bisa dimatikan di pengaturan). Volume VO, musik, hujan, dan efek terpisah.
- Ukuran teks tiga tingkat. Mode kurangi gerak mematikan inersia kamera, kedip lampu, dan kilat.
- Kilat dibatasi redup dan tidak lebih dari tiga kali per detik. Opsi Mode ASMR Lembut menurunkan puncak petir dengan kompresor.
- Seluruh game dapat dimainkan dengan keyboard (bagian 12).

## 11. Audio

### 11.1 Voice Over

- **Model dan suara.** TTS AI (kandidat awal: Eleven Multilingual v2) dengan satu suara deep, soft, dan calm yang dipakai di semua klip. Di M0 diuji lima baris contoh. Bila kualitas bahasa Indonesianya belum cukup, evaluasi model lain atau rekaman suara manusia.
- **Naskah.** Banyak elipsis dan jeda koma, kalimat pendek, 25 sampai 45 detik per klip, tanpa kalimat motivasi klise.
- **Pengolahan offline dengan satu preset tetap.** Perlambatan 5 sampai 10 persen dengan pitch dipertahankan, EQ dan low-pass sekitar 8 kHz agar terdengar agak “mendem”, kompresor ringan, desis ruang mikrofon yang sangat tipis, dan helaan napas disisipkan di jeda. Tidak ada pemrosesan VO berat saat runtime.
- **Jumlah.** 29 klip: 24 respons (8 pendengar kali 3 nada), 1 pembuka, 1 Jeda Hujan, dan 3 penutup. Total sekitar 20 menit atau 16 sampai 20 MB. Pesan pendengar berupa teks tanpa suara.
- **Lisensi.** Periksa ketentuan penggunaan komersial paket yang dipakai, jangan meniru suara orang sungguhan tanpa izin tertulis, catat ID suara dan tanggal pembuatan di ASSETS.md, dan siapkan pengungkapan konten AI sesuai aturan platform distribusi.

### 11.2 Soundscape

| Lapisan | Isi | Jumlah |
| --- | --- | --- |
| Hujan | Loop hujan di kaca (dua intensitas), loop hujan atap dan jauh | 3 |
| Ruang dan kota | Room tone dengan desis tape, kota jauh | 2 |
| Petir | Gemuruh jauh, dipanning dengan PannerNode HRTF | 4 |
| Mekanik | Kaset masuk, play, stop, eject, motor tape deck, fader (3 variasi), knob, dengung CRT, faks mencetak, tombol ON AIR, klik lampu, ketikan, cangkir, kursi | sekitar 30 |
| UI | Hover, klik, konfirmasi, transisi layar | sekitar 8 |

### 11.3 Musik

Sepuluh kaset (bagian 7.3), masing-masing 2 sampai 4 menit, instrumental indie atau ambient tanpa vokal keras, total sekitar 28 MB. Dibuat sendiri atau memakai musik berlisensi yang mengizinkan penggunaan komersial dan redistribusi di web (CC0 atau lisensi komersial). Tag mood disimpan di data, bukan di nama file.

### 11.4 Graf Web Audio dan Loudness

```text
musik  -> low-shelf (Hangat) -> high-shelf -> low-pass (kamera dan tutup telinga) -> gain --+
hujan kaca -> low-pass (kamera) -> gain ------------------------------------------------+
hujan jauh -> low-pass (kamera) -> gain ------------------------------------------------+
ruang dan kota -> gain ------------------------------------------------------------------+--> master gain -> compressor (limiter) -> output
sfx -> gain -----------------------------------------------------------------------------+
petir -> PannerNode (HRTF) -> gain ------------------------------------------------------+
vo -> gain ------------------------------------------------------------------------------+
```

| Bus | Target loudness |
| --- | --- |
| VO | sekitar -18 LUFS |
| Musik | sekitar -20 LUFS |
| Hujan | sekitar -24 LUFS |
| Room tone | sekitar -34 LUFS |
| SFX | puncak sekitar -8 dBFS |

- Musik tidak diputar saat monolog. Saat VO berjalan, bus hujan turun sekitar 2 dB.
- Musik di-stream lewat elemen audio dan `MediaElementAudioSourceNode`. VO didekode saat dibutuhkan lalu dilepas. Loop hujan didekode (stereo, 30 sampai 45 detik) dan diulang dengan crossfade dua sumber selama 2 detik. Memori audio terdekode maksimal sekitar 120 MB.
- `AudioContext` dibuka lewat tombol Mulai di layar judul. Audio dijeda saat tab tidak aktif.

## 12. Kontrol PC

| Input | Fungsi |
| --- | --- |
| Gerak mouse atau seret tombol kanan | Melihat sekeliling (terbatas) |
| Klik kiri | Berinteraksi dengan objek dan menekan tombol |
| Seret fader atau knob | Mengatur mixer |
| Spasi atau Enter | Lanjut teks |
| 1, 2, 3 | Memilih respons A, B, C |
| 1 sampai 4 lalu panah kiri atau kanan (di Mode Zen) | Memilih dan mengatur kontrol mixer lewat keyboard |
| C (tahan) | Tutup telinga |
| Esc | Jeda dan menu |
| F11 | Layar penuh |

## 13. Stack dan Arsitektur

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Bundler dan dev | Node.js LTS dan Vite | Build statis, hot reload |
| 3D | Three.js (versi stabil terbaru, dikunci) | Tree-shaking dengan impor seperlunya |
| Bahasa | JavaScript ES modules dengan JSDoc dan `checkJs` | TypeScript opsional nanti |
| UI | HTML, CSS, SVG | Tanpa framework |
| Audio | Web Audio API langsung | Howler tidak dipakai karena PRD membutuhkan graf kustom |
| State | Store buatan sendiri dengan event emitter | Satu store |
| Animasi | CSS transition, GSAP bila perlu |  |
| Data | JSON dengan JSON Schema (Ajv) dan skrip validator |  |
| Tes | Vitest dan Playwright (smoke) |  |
| Debug | lil-gui (hanya build dev) |  |
| Deploy | Hosting statis: itch.io, GitHub Pages, atau Netlify |  |

**Lapisan kode.** Data (JSON, hanya dibaca), Core dan Systems (JavaScript murni tanpa DOM dan tanpa Three.js, sehingga bisa dites di Node), Presentasi (scene, UI, audio, hanya membaca state), dan Aplikasi (`main.js`).

**State game:** BOOT, TITLE, PEMBUKAAN, PESAN, RESPONS, VO, KASET, ZEN, BALASAN, JEDA\_HUJAN, PENUTUPAN, REKAP, BEBAS, PAUSED.

```text
penyiar-sunyi/
  index.html
  vite.config.js
  ASSETS.md
  src/
    main.js
    core/        (store, clock, rng, save, conditions)
    systems/     (night, listener, response, cassette, closeness, recap)
    scene/       (room, window-rain, city, camera-rig, interaction)
    ui/          (message, response-cards, subtitle, cassette-rack, menus, styles/)
    audio/       (audio-graph, voice, music, ambience, mixer-map)
    debug/
  data/
    listeners/   (L1.json ... L8.json)
    cassettes.json
    monologues.json
    recap.json
    balance.json
  schema/
  scripts/       (validate-data.js, check-loudness.js)
  tests/
  public/audio/  (vo/, music/, sfx/)
```

## 14. Penyimpanan

`localStorage` dengan dua kunci berversi. `penyiarsunyi.run` menyimpan malam yang sedang berjalan (nomor pendengar, kedekatan per pendengar, kaset yang sudah dipilih) dan diperbarui tiap siklus pendengar selesai. `penyiarsunyi.meta` menyimpan malam yang pernah diselesaikan, Rekap, pengaturan (volume, ukuran teks, subtitle, kualitas), dan status Ruang Siaran Bebas. Setiap objek memuat `schemaVersion` dan semua akses dibungkus try/catch, dengan fallback ke memori bila penyimpanan tidak tersedia. Melanjutkan permainan mengulang dari pesan pendengar yang sedang berjalan.

## 15. Performa dan Anggaran

| Metrik | Target |
| --- | --- |
| Frame rate | 60 fps preset Sedang, minimal 30 fps preset Rendah di GPU terintegrasi |
| Draw call | Di bawah 150 |
| Segitiga | Di bawah 150 ribu |
| Tekstur | Maksimal 2K untuk atlas properti meja, total di bawah 150 MB di GPU |
| JavaScript (gzip) | Di bawah 400 KB |
| Waktu ke layar judul | Di bawah 4 detik pada koneksi broadband |
| Ukuran awal sebelum layar judul | Di bawah 10 MB |
| Total audio | Sekitar 60 MB (VO 20, musik 28, hujan dan efek sekitar 10), dimuat bertahap per pendengar |
| Memori audio terdekode | Maksimal sekitar 120 MB |

## 16. Pengujian

- **Unit (Vitest):** perhitungan selaras dan kedekatan, pemilihan varian (balasan, Pendengar 7, penutup), alur segmen malam, dan simpan atau muat.
- **Validator data:** setiap pendengar punya tiga respons dengan nada berbeda, setiap respons punya klip VO dan subtitle, baris subtitle tidak lebih dari 120 karakter, semua tag kaset valid, dan tidak ada emoji.
- **Skrip loudness:** memeriksa semua klip terhadap target bagian 11.4.
- **Smoke (Playwright):** halaman termuat, tidak ada error konsol, dan satu siklus pendengar berjalan.
- **Manual:** uji dengar memakai headphone dan speaker, profil performa di GPU terintegrasi, uji sesi 40 menit untuk kebocoran memori, dan pemeriksaan kilat terhadap batas aksesibilitas.

## 17. Daftar Aset

| Jenis | Isi | Jumlah |
| --- | --- | --- |
| Model 3D (prosedural atau glTF kecil) | Meja, mikrofon, mixer (tiga fader dan satu knob), tape deck, rak dan 10 kaset, CRT atau faks, lampu meja, lampu ON AIR, cangkir, jam dinding, buku catatan, headphone, jendela, kota low-poly | sekitar 20 objek |
| Ikon dan kursor SVG | Kursor (panah, tangan, geser), indikator kaset, ikon menu, bingkai panel, lencana Rekap | sekitar 30 |
| Voice over | Bagian 11.1 | 29 klip |
| Musik | Sepuluh kaset | 10 |
| Hujan, ruang, petir | Bagian 11.2 | 9 |
| Efek suara | Mekanik dan UI | sekitar 38 |
| Font | Lora dan DM Sans | 2 |

## 18. Milestone

Estimasi kasar untuk satu pengembang paruh waktu, disesuaikan setelah M0.

| Milestone | Isi | Perkiraan |
| --- | --- | --- |
| M0 Prototipe risiko | Uji lima baris VO, prototipe shader hujan di kaca, dan graf audio dasar | 1 minggu |
| M1 Fondasi | Vite, state machine, panggung UI dengan skala, validator, dan tes dasar | 1 minggu |
| M2 Ruang siaran | Scene, pencahayaan, kota, jendela, kamera terbatas, interaksi objek | 3 minggu |
| M3 Audio engine | Graf Web Audio, mixer, pemetaan kamera ke audio, tutup telinga, loop, streaming | 2 minggu |
| M4 Loop inti | Pesan, respons, kaset, Mode Zen, balasan, dan Kedekatan (dua pendengar uji) | 3 minggu |
| M5 Konten | Delapan pendengar, tiga monolog, Rekap, 29 klip VO, 10 kaset | 4 minggu |
| M6 Poles | UI akhir, aksesibilitas, preset kualitas, Ruang Siaran Bebas, simpan progres | 2 minggu |
| M7 QA dan rilis | Uji dengar, performa, perbaikan, dan rilis | 2 minggu |

## 19. Risiko dan Keputusan Terbuka

- **Kualitas dan lisensi TTS.** Mitigasi: uji prototipe di M0, siapkan rekaman suara manusia sebagai cadangan.
- **Sumber musik.** Keputusan terbuka: dibuat sendiri atau berlisensi komersial. Pastikan lisensi mengizinkan distribusi di web.
- **Performa hujan di kaca pada GPU terintegrasi.** Mitigasi: render target setengah resolusi, satu blur, preset kualitas, dan penurunan otomatis.
- **Loop terasa berulang.** Mitigasi: Kedekatan dan callback, Jeda Hujan di tengah, kabar lanjutan, dan Ruang Siaran Bebas.
- **Beban produksi VO.** Mitigasi: versi 1 hanya satu malam dengan 8 pendengar. Malam tambahan bisa dirilis kemudian.
- **Keputusan terbuka:** nama dan jenis kelamin suara Penyiar, apakah Ruang Siaran Bebas tersedia sejak awal (usulan: ya), apakah “usap embun” masuk versi 1 (usulan: P2), JavaScript atau TypeScript (usulan: JavaScript dengan JSDoc), dan apakah bahasa naskah murni Indonesia (diasumsikan ya).

## Lampiran A. Contoh Data Pendengar (L1)

```json
{
  "id": "L1",
  "handle": "Rani",
  "mood": "lelah",
  "fitTone": ["menemani"],
  "message": "Kak Sunyi, aku masih di kantor. Lampu lantai ini tinggal satu yang nyala. Aku capek, tapi nggak tahu capek karena apa.",
  "responses": [
    { "id": "A", "tone": "menemani", "label": "Aku di sini, menemanimu", "vo": "vo/L1_A.ogg", "subtitle": ["Aku di sini... jam segini, aku juga masih terjaga.", "Capek yang nggak ada namanya... itu juga capek, Rani."] },
    { "id": "B", "tone": "menenangkan", "label": "Tarik napas dulu", "vo": "vo/L1_B.ogg", "subtitle": ["Tarik napas... pelan.", "Pekerjaannya bisa menunggu satu lagu."] },
    { "id": "C", "tone": "mendorong", "label": "Sebentar lagi pulang", "vo": "vo/L1_C.ogg", "subtitle": ["Sebentar lagi... matikan lampunya, pulanglah."] }
  ],
  "replies": {
    "hangat": "Terima kasih sudah menemani. Aku pulang sekarang.",
    "biasa": "Terima kasih lagunya, Kak.",
    "tenang": "Iya, Kak. Aku dengarkan dulu."
  }
}
```
