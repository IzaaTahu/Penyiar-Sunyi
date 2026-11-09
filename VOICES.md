# Panduan Suara Penyiar (ElevenLabs)

Game *Penyiar Sunyi* sekarang mendukung suara pra-rekam dari **ElevenLabs**. Semua file audio diletakkan di folder:

```
public/voices/
```

Sistem audio game mendukung **dua format**:
1. **Format Gabungan per-Segmen (Sangat Disarankan ⭐):**  
   Satu paragraf dialog di-generate sebagai satu file `.mp3` utuh. Memberikan intonasi, tarikan napas, dan *mood* emosional radio malam yang jauh lebih natural!
2. **Format Per-Kalimat:**  
   Setiap kalimat di-generate sebagai file terpisah (`opening_0.mp3`, `opening_1.mp3`, dst.).

---

## Format Gabungan (Hanya 29 File — Rekomendasi Utama)

Cukup generate 1 file per segmen, lalu beri nama sesuai tabel. Di game, subtitle teks akan otomatis berpindah baris demi baris mengikuti jalannya audio!

### 1. Monolog Pembuka
* **Nama File:** `opening.mp3`
* **Teks untuk di-generate di ElevenLabs:**
```
Malam ini... hujan datang lagi.
Selamat malam. Aku Sunyi. Di 91,7... Teman Jaga.
Kalau kamu sedang di jalan, atau di kamar yang lampunya masih nyala... kamu tidak sendirian.
```
* **Catatan:** berkas `opening.mp3` yang dipakai sekarang hanya berisi tiga baris di atas. Waktu ganti subtitle ada di `OPENING_LINE_ENDS` (`src/main.js`); kalau file VO diganti, perbarui angka itu juga.

---

### 2. Jeda Hujan (Tengah Malam)
* **Nama File:** `rain_pause.mp3`
* **Teks:**
```
Jam satu. Hujannya belum berhenti.
Bagian ini... tidak ada pesan. Tidak ada yang perlu dijawab.
Kadang yang kita butuh cuma suara hujan, dan tahu ada orang lain yang juga terjaga.
Silakan putar lagunya. Aku akan di sini.
```

---

### 3. Monolog Penutup (Subuh)

#### Varian Tenang (Low Closeness)
* **Nama File:** `closing_low.mp3`
* **Teks:**
```
Lima pagi. Langit mulai berubah, tapi hujannya masih setia.
Malam ini... mungkin tidak banyak yang berubah. Itu tidak apa-apa.
Terima kasih sudah menemani. Besok... kalau kamu masih di sini, aku juga.
Selamat pagi. Pelan-pelan saja.
```

#### Varian Pelan (Mid Closeness)
* **Nama File:** `closing_mid.mp3`
* **Teks:**
```
Lima pagi. Di luar, langit mulai biru... sedikit.
Malam ini ada beberapa suara yang datang, dan semuanya kudengar.
Terima kasih sudah berbagi malam. Kamu boleh tidur sekarang. Atau diam sebentar lagi.
Sunyi FM 91,7. Sampai nanti.
```

#### Varian Hangat (High Closeness)
* **Nama File:** `closing_high.mp3`
* **Teks:**
```
Lima pagi. Hujan sudah tinggal gerimis... dan jendela mulai terang.
Malam ini terasa tidak sepanjang biasanya. Mungkin karena ada kamu.
Terima kasih sudah percaya. Besok malam, aku simpan tempat yang sama.
Selamat pagi. Kamu sudah baik-baik saja. Aku juga... pelan-pelan.
```

---

### 4. Respon Pendengar (L1 s/d L8)

#### L1 — Rani (Lembur Kantor)
* `L1_A.mp3`:
  ```
  Aku di sini... jam segini, aku juga masih terjaga.
  Capek yang nggak ada namanya... itu juga capek, Rani.
  Nggak perlu dijelaskan. Duduk saja sebentar.
  ```
* `L1_B.mp3`:
  ```
  Tarik napas dulu... pelan.
  Pekerjaannya bisa menunggu satu lagu.
  Kamu nggak harus selesai malam ini.
  ```
* `L1_C.mp3`:
  ```
  Sebentar lagi... matikan lampunya, pulanglah.
  Jalan pulangnya pelan-pelan. Nggak ada yang mengejar.
  ```

#### L2 — Dito (Rindu Rumah)
* `L2_A.mp3`:
  ```
  Aku dengar... 'nggak apa-apa' yang diucapkan pelan itu kadang paling berat.
  Kamu kangen. Itu bukan salahmu.
  Nggak semua rasa rindu harus langsung diselesaikan.
  ```
* `L2_B.mp3`:
  ```
  Kamu nggak harus pulang malam ini.
  Kangen itu tanda kamu punya rumah yang masih menunggumu.
  Telepon saja besok. Nggak perlu banyak kata.
  ```
* `L2_C.mp3`:
  ```
  Kalau ada tiket... beli. Jangan tunggu semuanya rapi.
  Kadang pulang itu cukup dengan badan, bukan dengan cerita panjang.
  ```

#### L3 — Bu Maya (Sarang Kosong)
* `L3_A.mp3`:
  ```
  Aku di sini, Bu.
  Jam empat yang dulu ramai... sekarang terasa lain, ya.
  Nggak apa-apa kalau pagi ini hanya untuk Ibu sendiri.
  ```
* `L3_B.mp3`:
  ```
  Coba buat teh. Satu cangkir saja.
  Tubuh Ibu masih hafal jamnya. Biarkan saja, pelan-pelan.
  ```
* `L3_C.mp3`:
  ```
  Mungkin besok... masak sesuatu, walau cuma untuk Ibu.
  Pelan-pelan bikin pagi baru. Nggak perlu buru-buru.
  ```

#### L4 — Nadia (Skripsi)
* `L4_A.mp3`:
  ```
  Kamu bukan nilai sidangmu, Nadia.
  Takut itu datang karena kamu peduli. Bukan karena kamu kurang.
  Aku juga pernah merasa tertinggal. Rasanya tidak enak.
  ```
* `L4_B.mp3`:
  ```
  Satu halaman dulu. Malam ini tidak perlu selesai.
  Besok, baca ulang. Kamu akan melihat lebih banyak dari yang kamu kira.
  ```
* `L4_C.mp3`:
  ```
  Tutup laptopnya. Tidur.
  Besok kamu masih punya dirimu. Yang itu tidak hilang.
  ```

#### L5 — Kopi Hitam (Ingin Resign)
* `L5_A.mp3`:
  ```
  Kamu sudah memikirkannya tiga tahun. Itu bukan keputusan mendadak.
  Yang kamu takutkan mungkin bukan perginya. Tapi kehilangan rasa aman.
  ```
* `L5_B.mp3`:
  ```
  Takut kehilangan aman itu wajar. Jangan dimarahi.
  Kamu boleh menunggu sampai badanmu ikut yakin.
  ```
* `L5_C.mp3`:
  ```
  Yang bikin takut bukan perginya... tapi tidak pernah mencoba.
  Nggak harus hari ini. Tapi jangan selamanya juga.
  ```

#### L6 — Pak Danu (Sopir Truk)
* `L6_A.mp3`:
  ```
  Kamu hadir lewat cara yang kamu bisa, Pak.
  Sepatu itu juga doa, walau tidak diucapkan.
  Anak Bapak tahu, walau mungkin belum bisa mengatakannya.
  ```
* `L6_B.mp3`:
  ```
  Nggak semua ayah bisa pulang tiap malam. Itu bukan berarti kurang.
  Jalan yang panjang juga cara mencintai.
  ```
* `L6_C.mp3`:
  ```
  Telepon dia. Bilang sepatunya bagus. Itu cukup untuk malam ini.
  Besok... cari satu hari untuk pulang. Satu hari saja.
  ```

#### L7 — Rani (Kembali)
* `L7_A.mp3`:
  ```
  Kamu sudah memikirkan hal yang selama ini kamu hindari. Itu bukan kecil.
  Aku di sini. Besok, setelah semuanya, kamu bisa cerita lagi.
  ```
* `L7_B.mp3`:
  ```
  Nggak harus berani hari ini.
  Besok juga masih boleh pelan. Yang penting kamu tahu kamu ingin mencoba.
  ```
* `L7_C.mp3`:
  ```
  Bilang saja. Pendek juga cukup.
  Kamu sudah lama menunggu dirimu sendiri. Jangan buat dia menunggu lebih lama.
  ```

#### L8 — Pendengar Tetap
* `L8_A.mp3`:
  ```
  Aku... belum sepenuhnya. Tapi malam ini cukup.
  Terima kasih sudah bertanya. Jarang ada yang bertanya ke penyiar.
  Kita sama-sama terjaga, dan itu sudah cukup.
  ```
* `L8_B.mp3`:
  ```
  Ada lelah yang aku simpan di sela lagu.
  Pelan-pelan saja. Malam ini kita tidak perlu menyelesaikan apa-apa.
  ```
* `L8_C.mp3`:
  ```
  Kalau aku jawab jujur... belum.
  Tapi aku masih di sini. Dan malam ini, itu sesuatu.
  ```

---

## Generate Otomatis Menggunakan Script

```powershell
# Generate semua 29 file gabungan sekaligus:
node scripts/generate_voices.mjs --key="API_KEY" --voice="VOICE_ID"

# Tes hanya opening.mp3:
node scripts/generate_voices.mjs --key="API_KEY" --voice="VOICE_ID" --only=opening
```
