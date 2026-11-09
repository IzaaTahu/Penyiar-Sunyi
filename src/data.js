/**
 * Isi malam: pendengar, kaset, monolog.
 * Data murni — tidak menyentuh DOM, Three.js, atau audio.
 *
 * `src` menunjuk ke berkas lagu di public/music/. Nama file bebas — yang penting
 * sama persis dengan `src` di sini. Judul/artis juga bebas.
 *
 * `id` (K1..K10) dipakai di daftar `cassettes` tiap pendengar; kalau id diganti,
 * sesuaikan juga LISTENERS di bawah. `tags` dipakai untuk menilai kecocokan
 * suasana lagu dengan mood pendengar.
 *
 * `cues` (detik) menandai bagian instrumental:
 *   intro     — vokal belum masuk; penyiar boleh bicara di sini.
 *   interlude — jeda instrumental di tengah lagu (opsional).
 *   outro     — vokal sudah selesai.
 * Penyiar hanya mulai bicara di `intro`. Angka di bawah sengaja dibuat agak
 * pendek: kalau cue kurang, musik otomatis meredup lebih dalam saat penyiar
 * masih bicara, jadi vokal lagu tetap tidak menabrak suara penyiar.
 */

export const TONES = {
  menemani: "Menemani",
  menenangkan: "Menenangkan",
  mendorong: "Mendorong",
};

export const CASSETTES = [
  {
    id: "K1", title: "Diri", artist: "Tulus", style: "Pop Akustik Mellow",
    src: "/music/K1_Tulus_Diri.mp3", tags: ["lelah", "cemas", "healing"],
    cues: { intro: 10 },
  },
  {
    id: "K2", title: "Beranjak Dewasa", artist: "Nadin Amizah", style: "Folk Pop Melankolis",
    src: "/music/K2_Nadin_Beranjak_Dewasa.mp3", tags: ["ragu", "cemas"],
    cues: { intro: 10 },
  },
  {
    id: "K3", title: "Bagai Bintang Bulan", artist: "Feby Putri", style: "Akustik Mellow",
    src: "/music/K3_Feby_Bagai_Bintang_Bulan.mp3", tags: ["rindu", "sepi"],
    cues: { intro: 10 },
  },
  {
    id: "K4", title: "Runtuh", artist: "Feby Putri feat. Fiersa Besari", style: "Ballad Akustik",
    src: "/music/K4_Feby_Runtuh.mp3", tags: ["hampa", "cemas", "sepi"],
    cues: { intro: 10 },
  },
  {
    id: "K5", title: "Kadang Aku Lupa (Hai Tetangga)", artist: "Pia Meraleo (JKT48V)", style: "Pop Mellow",
    src: "/music/K5_Pia_Hai_Tetangga.mp3", tags: ["lelah", "hampa"],
    cues: { intro: 10 },
  },
  {
    id: "K6", title: "Jiwa yang Bersedih", artist: "Ghea Indrawari", style: "Ballad Piano",
    src: "/music/K6_Ghea_Jiwa_Yang_Bersedih.mp3", tags: ["hampa", "cemas", "sepi"],
    cues: { intro: 10 },
  },
  {
    id: "K7", title: "Resah Jadi Luka", artist: "Daun Jatuh", style: "Indie Folk",
    src: "/music/K7_Daun_Resah_Jadi_Luka.mp3", tags: ["sepi", "hampa", "rindu"],
    cues: { intro: 10 },
  },
  {
    id: "K8", title: "Kekal", artist: "Nadin Amizah", style: "Indie Folk",
    src: "/music/K8_Nadin_Kekal.mp3", tags: ["rindu", "sepi"],
    cues: { intro: 10 },
  },
  {
    id: "K9", title: "Menangis di Jalan Pulang", artist: "Nadin Amizah", style: "Indie Folk Melankolis",
    src: "/music/K9_Nadin_Menangis_Di_Jalan_Pulang.mp3", tags: ["lelah", "sepi", "hampa"],
    cues: { intro: 10 },
  },
  {
    id: "K10", title: "Waktu", artist: "Aku Jeje", style: "Pop Mellow",
    src: "/music/K10_Jeje_Waktu.mp3", tags: ["ragu", "hampa"],
    cues: { intro: 10 },
  },
];

export const LISTENERS = [
  {
    id: "L1", handle: "Rani", age: 26, mood: "lelah", fitTone: "menemani",
    cassettes: ["K1", "K9", "K5"], clock: "22:30",
    message: "Kak Sunyi, aku masih di kantor. Lampu lantai ini tinggal satu yang nyala. Aku capek, tapi nggak tahu capek karena apa.",
    responses: [
      { id: "A", tone: "menemani", label: "Aku di sini, menemanimu", lines: [
        "Aku di sini... jam segini, aku juga masih terjaga.",
        "Capek yang nggak ada namanya... itu juga capek, Rani.",
        "Nggak perlu dijelaskan. Duduk saja sebentar.",
      ] },
      { id: "B", tone: "menenangkan", label: "Tarik napas dulu", lines: [
        "Tarik napas dulu... pelan.",
        "Pekerjaannya bisa menunggu satu lagu.",
        "Kamu nggak harus selesai malam ini.",
      ] },
      { id: "C", tone: "mendorong", label: "Sebentar lagi pulang", lines: [
        "Sebentar lagi... matikan lampunya, pulanglah.",
        "Jalan pulangnya pelan-pelan. Nggak ada yang mengejar.",
      ] },
    ],
    replies: {
      hangat: "Terima kasih sudah menemani. Aku pulang sekarang. Besok aku dengar lagi.",
      biasa: "Terima kasih lagunya, Kak. Aku matikan lampunya sekarang.",
      tenang: "Iya, Kak. Aku dengarkan dulu sampai lagunya habis.",
    },
    recap: {
      hangat: "Aku pulang lewat jalan yang basah. Rasanya ringan, walau capeknya masih ada.",
      biasa: "Lampunya sudah kumatikan. Aku tidur lebih awal malam itu.",
      tenang: "Aku masih di mejaku sebentar. Tapi tidak selama tadi.",
    },
  },
  {
    id: "L2", handle: "Dito", age: 31, mood: "rindu", fitTone: "menenangkan",
    cassettes: ["K3", "K8", "K7"], clock: "23:10",
    message: "Aku nggak pulang tiga lebaran. Tiap video call, ibuku bilang 'nggak apa-apa'. Justru itu yang bikin berat.",
    responses: [
      { id: "A", tone: "menemani", label: "'Nggak apa-apa' itu berat", lines: [
        "Aku dengar... 'nggak apa-apa' yang diucapkan pelan itu kadang paling berat.",
        "Kamu kangen. Itu bukan salahmu.",
        "Nggak semua rasa rindu harus langsung diselesaikan.",
      ] },
      { id: "B", tone: "menenangkan", label: "Tidak harus pulang malam ini", lines: [
        "Kamu nggak harus pulang malam ini.",
        "Kangen itu tanda kamu punya rumah yang masih menunggumu.",
        "Telepon saja besok. Nggak perlu banyak kata.",
      ] },
      { id: "C", tone: "mendorong", label: "Kalau ada tiket, beli", lines: [
        "Kalau ada tiket... beli. Jangan tunggu semuanya rapi.",
        "Kadang pulang itu cukup dengan badan, bukan dengan cerita panjang.",
      ] },
    ],
    replies: {
      hangat: "Aku baru beli tiket. Bulan depan. Ibu belum tahu.",
      biasa: "Mungkin aku telepon ibu besok, sebelum dia tidur.",
      tenang: "Aku dengar lagunya sampai habis. Cukup untuk malam ini.",
    },
    recap: {
      hangat: "Aku menelepon ibu pagi tadi. Dia menangis, lalu bilang 'nggak apa-apa' lagi.",
      biasa: "Aku belum menelepon. Tapi nomornya sudah kubuka.",
      tenang: "Aku menunda lagi. Mungkin bukan malam ini.",
    },
  },
  {
    id: "L3", handle: "Bu Maya", age: 52, mood: "sepi", fitTone: "menemani",
    cassettes: ["K6", "K7", "K8", "K9"], clock: "23:50",
    message: "Dulu aku bangun jam empat untuk menyiapkan bekal. Sekarang aku bangun jam empat, dan tidak ada yang perlu disiapkan.",
    responses: [
      { id: "A", tone: "menemani", label: "Aku di sini, Bu", lines: [
        "Aku di sini, Bu.",
        "Jam empat yang dulu ramai... sekarang terasa lain, ya.",
        "Nggak apa-apa kalau pagi ini hanya untuk Ibu sendiri.",
      ] },
      { id: "B", tone: "menenangkan", label: "Buat teh, satu cangkir", lines: [
        "Coba buat teh. Satu cangkir saja.",
        "Tubuh Ibu masih hafal jamnya. Biarkan saja, pelan-pelan.",
      ] },
      { id: "C", tone: "mendorong", label: "Masak sesuatu besok", lines: [
        "Mungkin besok... masak sesuatu, walau cuma untuk Ibu.",
        "Pelan-pelan bikin pagi baru. Nggak perlu buru-buru.",
      ] },
    ],
    replies: {
      hangat: "Aku buat teh. Cangkir yang dulu dipakai anakku. Rasanya hangat.",
      biasa: "Iya, Nak. Besok aku coba masak lagi.",
      tenang: "Aku duduk saja dulu. Hujan ini enak didengar.",
    },
    recap: {
      hangat: "Aku menyalakan lampu dapur pagi ini. Untuk diriku sendiri.",
      biasa: "Aku bangun jam empat lagi. Tapi aku tidak buru-buru bangun.",
      tenang: "Rumah masih sepi. Aku sedang belajar tidak takut dengannya.",
    },
  },
  {
    id: "L4", handle: "Nadia", age: 22, mood: "cemas", fitTone: "menenangkan",
    cassettes: ["K1", "K2", "K4", "K6"], clock: "00:30",
    message: "Skripsiku jalan di tempat. Semua teman sudah sidang. Aku takut ternyata aku memang nggak cukup.",
    responses: [
      { id: "A", tone: "menemani", label: "Kamu bukan nilai sidangmu", lines: [
        "Kamu bukan nilai sidangmu, Nadia.",
        "Takut itu datang karena kamu peduli. Bukan karena kamu kurang.",
        "Aku juga pernah merasa tertinggal. Rasanya tidak enak.",
      ] },
      { id: "B", tone: "menenangkan", label: "Satu halaman dulu", lines: [
        "Satu halaman dulu. Malam ini tidak perlu selesai.",
        "Besok, baca ulang. Kamu akan melihat lebih banyak dari yang kamu kira.",
      ] },
      { id: "C", tone: "mendorong", label: "Tutup laptop, tidur", lines: [
        "Tutup laptopnya. Tidur.",
        "Besok kamu masih punya dirimu. Yang itu tidak hilang.",
      ] },
    ],
    replies: {
      hangat: "Aku menutup laptop. Untuk pertama kali bulan ini, rasanya aku boleh berhenti.",
      biasa: "Aku baca ulang besok saja. Malam ini aku tidur.",
      tenang: "Aku masih memikirkannya. Tapi tidak sekeras tadi.",
    },
    recap: {
      hangat: "Aku menulis satu halaman pagi ini. Kecil, tapi ada.",
      biasa: "Aku belum membuka laptop. Setidaknya aku tidur.",
      tenang: "Skripsinya masih di sana. Aku juga masih di sini.",
    },
  },
  {
    id: "L5", handle: "Kopi Hitam", age: null, mood: "ragu", fitTone: "mendorong",
    cassettes: ["K2", "K10"], clock: "01:30",
    message: "Aku mau resign. Sudah tiga tahun mikir. Tapi tiap mau bilang, aku takut nggak ada yang lain.",
    responses: [
      { id: "A", tone: "menemani", label: "Tiga tahun bukan mendadak", lines: [
        "Kamu sudah memikirkannya tiga tahun. Itu bukan keputusan mendadak.",
        "Yang kamu takutkan mungkin bukan perginya. Tapi kehilangan rasa aman.",
      ] },
      { id: "B", tone: "menenangkan", label: "Takut itu wajar", lines: [
        "Takut kehilangan aman itu wajar. Jangan dimarahi.",
        "Kamu boleh menunggu sampai badanmu ikut yakin.",
      ] },
      { id: "C", tone: "mendorong", label: "Jangan tunggu selamanya", lines: [
        "Yang bikin takut bukan perginya... tapi tidak pernah mencoba.",
        "Nggak harus hari ini. Tapi jangan selamanya juga.",
      ] },
    ],
    replies: {
      hangat: "Aku menulis surat pengunduran diri. Belum kukirim, tapi sudah ada.",
      biasa: "Aku belum bilang apa-apa. Tapi aku tahu aku harus mulai.",
      tenang: "Mungkin aku masih butuh waktu. Terima kasih sudah tidak mendesak.",
    },
    recap: {
      hangat: "Suratnya masih di laci. Tapi aku sudah berhenti berbohong pada diriku.",
      biasa: "Aku masih di kantor yang sama. Aku sedang mencari jalan lain.",
      tenang: "Aku bertahan sedikit lagi. Mungkin kali ini dengan mata terbuka.",
    },
  },
  {
    id: "L6", handle: "Pak Danu", age: 45, mood: "rindu", fitTone: "mendorong",
    cassettes: ["K3", "K7", "K8"], clock: "02:30",
    message: "Aku di rest area, truk masih menyala. Anakku kirim foto sepatu baru. Dia sudah besar. Aku cuma bisa bayar, belum bisa hadir.",
    responses: [
      { id: "A", tone: "menemani", label: "Kamu hadir dengan caramu", lines: [
        "Kamu hadir lewat cara yang kamu bisa, Pak.",
        "Sepatu itu juga doa, walau tidak diucapkan.",
        "Anak Bapak tahu, walau mungkin belum bisa mengatakannya.",
      ] },
      { id: "B", tone: "menenangkan", label: "Bukan berarti kurang", lines: [
        "Nggak semua ayah bisa pulang tiap malam. Itu bukan berarti kurang.",
        "Jalan yang panjang juga cara mencintai.",
      ] },
      { id: "C", tone: "mendorong", label: "Telepon dia malam ini", lines: [
        "Telepon dia. Bilang sepatunya bagus. Itu cukup untuk malam ini.",
        "Besok... cari satu hari untuk pulang. Satu hari saja.",
      ] },
    ],
    replies: {
      hangat: "Aku baru selesai telepon. Dia bilang sepatunya kepakai ke sekolah besok.",
      biasa: "Aku kirim pesan saja. Nanti pagi dia balas.",
      tenang: "Aku lihat fotonya lagi. Cukup untuk menemani jalan pulang.",
    },
    recap: {
      hangat: "Aku menjadwalkan pulang bulan ini. Truknya bisa istirahat satu hari.",
      biasa: "Aku masih di jalan. Tapi aku menelepon lebih sering.",
      tenang: "Fotonya masih di dashboard. Jalan pulang masih panjang.",
    },
  },
  {
    id: "L7", handle: "Rani", age: 26, mood: "ragu", fitTone: "mendorong",
    cassettes: ["K2", "K10"], clock: "03:30",
    message: "Kak, aku yang tadi di kantor. Aku sudah di rumah. Tadi aku sempat mikir... besok mau bilang apa ke atasku. Aku belum berani. Tapi aku mau coba.",
    messages: {
      high: "Kak, aku yang tadi di kantor. Aku sudah di rumah. Tadi aku sempat mikir... besok mau bilang apa ke atasku. Aku belum berani. Tapi aku mau coba.",
      mid: "Kak, aku masih di jalan. Tadi aku sempat dengar lagunya dari awal. Aku belum tahu besok mau bagaimana, tapi lumayan.",
      low: "Kak, aku tadi yang menelepon. Aku masih di kantor, sebentar lagi pulang. Cuma mau bilang makasih.",
    },
    responses: [
      { id: "A", tone: "menemani", label: "Itu bukan hal kecil", lines: [
        "Kamu sudah memikirkan hal yang selama ini kamu hindari. Itu bukan kecil.",
        "Aku di sini. Besok, setelah semuanya, kamu bisa cerita lagi.",
      ] },
      { id: "B", tone: "menenangkan", label: "Besok juga masih boleh pelan", lines: [
        "Nggak harus berani hari ini.",
        "Besok juga masih boleh pelan. Yang penting kamu tahu kamu ingin mencoba.",
      ] },
      { id: "C", tone: "mendorong", label: "Bilang saja, pendek juga cukup", lines: [
        "Bilang saja. Pendek juga cukup.",
        "Kamu sudah lama menunggu dirimu sendiri. Jangan buat dia menunggu lebih lama.",
      ] },
    ],
    replies: {
      hangat: "Aku akan bilang besok. Aku sudah menulis kalimat pertamanya. Terima kasih, Kak.",
      biasa: "Mungkin minggu ini. Aku belum tahu kapan, tapi aku tidak menghindar lagi.",
      tenang: "Aku masih takut. Tapi aku tidak sendirian malam ini.",
    },
    recap: {
      hangat: "Aku bicara pada atasku. Suaraku gemetar, tapi aku selesai.",
      biasa: "Aku belum bicara. Tapi aku berhenti berpura-pura baik-baik saja.",
      tenang: "Aku pulang dan tidur. Besok masih ada.",
    },
  },
  {
    id: "L8", handle: "Pendengar Tetap", age: null, mood: "hampa", fitTone: "menemani",
    cassettes: ["K4", "K5", "K6", "K9"], clock: "04:00",
    message: "Aku mendengarkan dari awal, tiap malam. Aku nggak pernah menelepon. Malam ini aku cuma mau bilang... terima kasih. Kamu sendiri sudah baik-baik saja?",
    responses: [
      { id: "A", tone: "menemani", label: "Belum sepenuhnya, tapi cukup", lines: [
        "Aku... belum sepenuhnya. Tapi malam ini cukup.",
        "Terima kasih sudah bertanya. Jarang ada yang bertanya ke penyiar.",
        "Kita sama-sama terjaga, dan itu sudah cukup.",
      ] },
      { id: "B", tone: "menenangkan", label: "Ada lelah yang kusimpan", lines: [
        "Ada lelah yang aku simpan di sela lagu.",
        "Pelan-pelan saja. Malam ini kita tidak perlu menyelesaikan apa-apa.",
      ] },
      { id: "C", tone: "mendorong", label: "Belum, tapi aku masih di sini", lines: [
        "Kalau aku jawab jujur... belum.",
        "Tapi aku masih di sini. Dan malam ini, itu sesuatu.",
      ] },
    ],
    replies: {
      hangat: "Terima kasih sudah jujur. Aku juga belum, kalau itu membantu.",
      biasa: "Aku mengerti. Kita sama-sama belajar.",
      tenang: "Tidak apa-apa. Aku tetap di sini, mendengarkan.",
    },
    recap: {
      hangat: "Aku mendengarkan sampai subuh. Untuk pertama kali, aku tidak merasa sendirian.",
      biasa: "Aku masih mendengarkan. Mungkin malam depan aku menelepon lagi.",
      tenang: "Aku menutup radio saat langit terang. Sampai nanti.",
    },
  },
];

export const MONOLOGUES = {
  opening: [
    "Malam ini... hujan datang lagi.",
    "Selamat malam. Aku Sunyi. Di 91,7... Teman Jaga.",
    "Kalau kamu sedang di jalan, atau di kamar yang lampunya masih nyala... kamu tidak sendirian.",
  ],
  rainPause: [
    "Jam satu. Hujannya belum berhenti.",
    "Bagian ini... tidak ada pesan. Tidak ada yang perlu dijawab.",
    "Kadang yang kita butuh cuma suara hujan, dan tahu ada orang lain yang juga terjaga.",
    "Silakan putar lagunya. Aku akan di sini.",
  ],
  closing: {
    low: [
      "Lima pagi. Langit mulai berubah, tapi hujannya masih setia.",
      "Malam ini... mungkin tidak banyak yang berubah. Itu tidak apa-apa.",
      "Terima kasih sudah menemani. Besok... kalau kamu masih di sini, aku juga.",
      "Selamat pagi. Pelan-pelan saja.",
    ],
    mid: [
      "Lima pagi. Di luar, langit mulai biru... sedikit.",
      "Malam ini ada beberapa suara yang datang, dan semuanya kudengar.",
      "Terima kasih sudah berbagi malam. Kamu boleh tidur sekarang. Atau diam sebentar lagi.",
      "Sunyi FM 91,7. Sampai nanti.",
    ],
    high: [
      "Lima pagi. Hujan sudah tinggal gerimis... dan jendela mulai terang.",
      "Malam ini terasa tidak sepanjang biasanya. Mungkin karena ada kamu.",
      "Terima kasih sudah percaya. Besok malam, aku simpan tempat yang sama.",
      "Selamat pagi. Kamu sudah baik-baik saja. Aku juga... pelan-pelan.",
    ],
  },
};

export const RECAP_TITLES = {
  low: { title: "Malam yang tenang", sub: "Tidak semua malam harus mengubah sesuatu." },
  mid: { title: "Malam yang pelan", sub: "Beberapa suara sempat singgah, dan kau mendengarnya." },
  high: { title: "Malam yang hangat", sub: "Hujan di luar, tetapi ada yang terasa lebih dekat." },
};

export const SEGMENTS = {
  openingCassette: { clock: "22:00", label: "Kaset pembuka" },
  rainPause: { clock: "01:00", label: "Jeda Hujan" },
  closingCassette: { clock: "05:00", label: "Kaset penutup" },
};

export const FREE_CASSETTES = CASSETTES;
