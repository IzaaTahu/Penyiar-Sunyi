# Penyiar Sunyi

Simulasi naratif radio malam hujan. Kamu adalah penyiar Sunyi FM 91,7 — satu malam, delapan pendengar, sepuluh kaset, dan hujan yang tidak minta apa-apa.

Dibuat untuk PC (mouse + keyboard) di browser modern dengan WebGL2 dan Web Audio API. Tidak ada skor, tidak ada game over, tidak ada emoji.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5176`.

Build produksi:

```bash
npm run build
npm run preview
```

## Kontrol

| Aksi | Kontrol |
| --- | --- |
| Lanjut / pilih | `Space`, `Enter`, atau klik |
| Pilih respons | `1` `2` `3` atau klik kartu |
| Lihat sekeliling | gerakkan mouse |
| Lihat bebas saat siaran | tahan klik kanan lalu seret |
| Nyalakan / matikan lampu | klik lampu meja atau lampu gantung |
| Buka / tutup gorden | klik gorden atau batang gorden |
| Uap kopi | klik cangkir |
| Atur fader | seret fader di mixer, atau `1`–`4` lalu `←` `→` |
| Tutup telinga (muffle) | tahan `C` |
| Jeda | `Esc` |
| Lewati lagu | `N` atau `S`, atau tombol **Lewati** |
| Maju 30 detik | tombol **Maju 30 dtk** |
| Ganti kaset di mode bebas | `R` atau `N` |

## Musik

Lagu diputar dari berkas `.mp3` di `public/music/`. Berkasnya tidak ikut dalam repo — taruh sendiri. Judul dan nama file **bebas**: yang penting `src` di `src/data.js` sama dengan nama file. Daftar bawaan:

```
public/music/K1_Tulus_Diri.mp3
public/music/K2_Nadin_Beranjak_Dewasa.mp3
public/music/K3_Feby_Bagai_Bintang_Bulan.mp3
public/music/K4_Feby_Runtuh.mp3
public/music/K5_Pia_Hai_Tetangga.mp3
public/music/K6_Ghea_Jiwa_Yang_Bersedih.mp3
public/music/K7_Daun_Resah_Jadi_Luka.mp3
public/music/K8_Nadin_Kekal.mp3
public/music/K9_Nadin_Menangis_Di_Jalan_Pulang.mp3
public/music/K10_Jeje_Waktu.mp3
```

Mau pakai lagu lain? Edit `title`, `artist`, `src`, `tags`, dan `cues` di `src/data.js`. Kaset terakhir di daftar otomatis jadi kaset penutup.

Kalau sebuah berkas belum ada, game tetap berjalan: lagu itu dilewati otomatis setelah beberapa detik dan muncul pemberitahuan.

Setiap kaset punya `cues` di `src/data.js` (`intro`, `interlude`, `outro`, dalam detik). Penyiar hanya berbicara di bagian-bagian instrumental itu; saat ia bicara, musik meredup otomatis (*ducking* 0,5 detik turun, 1,2 detik naik). Sesuaikan `cues` setelah lagunya ada — lebih baik intro/outro dilebihkan sedikit daripada kurang.

Satu pendengar memakai satu lagu. Lagu dipilih **sebelum** pesan pendengar masuk, lalu terus berputar dan otomatis loop sampai pendengar berikutnya memilih lagu baru.

## Alur satu malam

1. Pembuka di ruang siaran, lalu pilih kaset pembuka. Lagu ini menjadi lagu pendengar pertama.
2. Pendengar pertama masuk di atas lagu itu: pesan → pilih cara menjawab → balasan penyiar → balasan pendengar. Tidak ada pilihan kaset lagi di tengah percakapan.
3. Setelah balasan, pilih kaset untuk pendengar berikutnya, baru pesannya masuk. Begitu seterusnya untuk delapan pendengar.
4. Setelah pendengar keempat ada jeda hujan: monolog, lagu tetap berjalan, lalu pilih kaset untuk pendengar kelima.
5. Setelah pendengar kedelapan: monolog penutup, kaset terakhir, lalu rekap dan fajar.
6. Progres disimpan di `localStorage`; "Lanjutkan Malam" tersedia dari layar judul.

Kedekatan tiap pendengar ditentukan oleh kecocokan nada jawaban dan suasana kaset. Tidak ditampilkan sebagai angka — hanya terasa lewat balasan, rekap, dan hujan yang sedikit mereda.

## Struktur

```
index.html          struktur DOM layar, panel, HUD
src/main.js         mesin keadaan, UI, simpanan, input, TTS opsional
src/data.js         pendengar, kaset, monolog, rekap
src/scene.js        ruang 3D, kota, hujan, mixer, kamera
src/audio.js        hujan/ruang/petir prosedural, pemutar .mp3, ducking, mixer
src/styles.css      sistem visual
public/favicon.svg  ikon
public/music/       berkas lagu .mp3 (diisi sendiri)
public/voices/      rekaman suara penyiar (opsional)
```

Hujan, ruang, dan efek UI dibuat saat runtime. Lagu dan suara penyiar memakai berkas audio. Lihat [ASSETS.md](ASSETS.md).

## Catatan teknis

- Resolusi internal mengikuti layar; kualitas grafis bisa diturunkan otomatis bila frame rate rendah.
- Hujan di kaca memakai render target kota beresolusi rendah dan shader refraksi layar.
- Audio baru mulai setelah interaksi pengguna, sesuai kebijakan browser.
- Suara penyiar memakai `speechSynthesis` bila tersedia dan diaktifkan di Pengaturan (eksperimental, nonaktif secara bawaan).
- `prefers-reduced-motion` dan opsi "Kurangi gerak & kilat" mematikan kilat serta sebagian animasi.
