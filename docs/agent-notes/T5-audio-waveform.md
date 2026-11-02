# T5 — Impor audio + waveform timeline (laporan agent)

Tanggal: 2026-11-01 · Branch: `agent/t5-audio` · Agent: ZCode (GLM)

## Tujuan
Impor file audio dari toolbar Timeline: `Project.audio` di-set (undoable), dan waveform 900 bucket digambar sebagai canvas di lane Audio.

## File yang diubah/dibuat

- `src/lib/audio.ts` (baru) —
  - `computePeaks(channel: Float32Array, buckets: number): number[]` — fungsi MURNI: data dibagi rata ke `buckets` bucket (`floor(i * buckets / length)`, jadi distribusi merata meski panjang data bukan kelipatan bucket), max absolut per bucket, bucket kosong = 0, lalu dinormalisasi 0..1 dengan membagi max keseluruhan. Input senyap (max 0) dibagi 1.0 → tetap nol semua (tanpa div/0). `buckets <= 0` → `[]`.
  - `AudioData = { name: string; duration: number; peaks: number[] }` dan `PEAK_BUCKETS = 900`.
  - `extractAudio(file: File): Promise<AudioData>` — BROWSER-ONLY: `await file.arrayBuffer()` → `decodeAudioData` via `window.AudioContext ?? window.webkitAudioContext` (bentuk callback dibungkus Promise untuk kompatibilitas Safari), context di-`close()` di `finally`. Downmix: RATA-RATA semua channel (didokumentasikan di JSDoc; channel 0 saja akan mengabaikan channel lain). `duration = buffer.duration`, `peaks = computePeaks(mixed, 900)`. Kegagalan decode / file kosong / API tidak ada → `Error` berbahasa Indonesia yang menyebut nama file. Tidak pernah diimpor dari test.
- `src/lib/audio.test.ts` (baru) — 8 tes `computePeaks` saja: jumlah bucket tepat, max-abs per bucket, distribusi rata antar batas bucket (nilai float32-exact 0.25/0.75 agar deterministik), normalisasi 0..1 (bucket terkeras = 1), senyap → nol semua, input kosong tanpa div/0, bucket > sampel (bucket kosong 0), `buckets <= 0` → `[]`.
- `src/stores/projectStore.ts` — action `setAudio(audio: { path; duration } | null)`: satu langkah undo via `commit(..., key: null)` (tidak pernah coalesce), dirty via `lastSaved` — pola persis `setWords`. JSDoc interface `ProjectState` diperbarui.
- `src/stores/projectStore.test.ts` — suite baru `projectStore.setAudio` (3 tes): set audio + dirty; satu undo step (undo mengembalikan snapshot lama by reference — sample project punya `audio: { path: "", duration: 8.5 }`, bukan null — redo memulihkan audio baru); `setAudio(null)` juga undoable + dirty.
- `src/stores/uiStore.ts` — `audioPeaks: number[] | null` (default `null`) + `setAudioPeaks` ditambahkan DI DALAM factory `createUiStore`; display-only, tidak disentuh `pickLayout`/`persist`, jadi kode persistensi layout T2 tidak berubah sama sekali.
- `src/stores/uiStore.test.ts` — suite baru `uiStore audioPeaks` (3 tes): set/clear, replace peak lama, dan TIDAK menulis ke storage layout (storage tetap kosong setelah `setAudioPeaks`, dan payload persist hanya 3 field layout).
- `src/components/timeline/Timeline.tsx` —
  - Toolbar: tombol `Audio` (class `btn small`) + hidden file input (`accept=".mp3,.wav,.ogg,.m4a,.flac,audio/*"`, pola yang sama dengan Buka/Subjudul di TopBar; value direset tiap pilihan).
  - Handler `importAudio`: sukses → `setAudio({ path: file.name, duration })` + `setAudioPeaks(peaks)` + error dibersihkan; gagal → pesan error ditampilkan di lane (state `audioError` lokal, tanpa alert).
  - Lane Audio: error → `.audio-placeholder.error` (role=alert); peaks ada → `<canvas className="audio-waveform">` selebar `canvasWidth`, tinggi 34 − 2×4 px padding; peaks kosong → placeholder lama ("Audio belum dimuat" / path).
  - `useEffect` menggambar bar simetris dari tengah (muted teal `rgba(47, 212, 180, 0.42)`, bar width 70% dari step, min 1px) dengan skala `devicePixelRatio`; dijalankan ulang saat `audioPeaks`, `canvasWidth`, atau `pixelsPerSecond` berubah.
  - `useEffect` cache-hygiene: bila `project.audio` menjadi `null`, `setAudioPeaks(null)` dipanggil (memenuhi "setAudioPeaks(null) saat setAudio(null), if practical"); undo `setAudio` TIDAK memulihkan peaks (peaks hanya display cache). Klik-to-seek lane tetap (canvas mengbubble ke `onClick` row).
- `src/styles/app.css` — `.audio-waveform { position: absolute; top: 4px; left: 0; display: block; }` dan `.audio-placeholder.error { color: var(--danger); opacity: 1; padding-right: 10px; }`.
- `docs/agent-notes/T5-audio-waveform.md` — laporan ini.

Tidak ada file lain yang disentuh (`App.tsx`, `package.json`, `src/types/**`, `docs/STATUS.md` tidak diubah). Tidak ada dependency baru. `node_modules` (symlink) tidak di-commit.

## Keputusan desain

- **Downmix = rata-rata semua channel.** Rata-rata menjaga amplitudo material mono-in-stereo tetap benar; memakai channel 0 saja akan membuang sisa channel. Didokumentasikan di JSDoc `extractAudio`.
- **"1.0 if max is 0" ditafsirkan sebagai pembagi 1.0.** Audio senyap → semua peak tetap 0 (bukan semua 1), menghindari div/0 dan tetap masuk rentang 0..1. Didokumentasikan di JSDoc `computePeaks`.
- **Distribusi bucket pakai `floor(i * buckets / length)`** bukan `floor(i / bucketSize)`, supaya setiap bucket terisi proporsional bahkan saat `length` bukan kelipatan `buckets`; bucket tetap bisa kosong saat `buckets > length` (di-tes).
- **Typing `webkitAudioContext` lokal** (`type WindowWithWebkitAudio = Window & typeof globalThis & {...}`) karena `src/types/**` tidak boleh diubah; `interface extends Window` saja tidak cukup karena `AudioContext` hidup di `typeof globalThis`.
- **Error import menggantikan tampilan lane, bukan alert.** Peaks/audio lama tidak dihapus saat import gagal; error ditampilkan dengan gaya `.audio-placeholder.error` (reuse slot yang sama).
- **Undo tidak menyentuh peaks.** Peaks adalah display cache di uiStore; hanya efek `project.audio === null` yang membersihkannya. Import audio baru otomatis me-replace peaks lama.
- **Tes float32-exact.** `Float32Array` menyimpan 0.6 sebagai 0.6000000238… sehingga 0.4/0.6 tidak sama persis dengan hasil float64; tes distribusi memakai 0.25/0.75 yang eksak di float32.

## Hasil validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS — `tsc --noEmit` bersih, exit 0 (setelah 2 perbaikan typing awal). |
| `npm run test` | PASS — 119 tests / 10 files, semua hijau (105 lama tetap hijau; +8 `audio.test.ts`, +3 `projectStore.setAudio`, +3 `uiStore audioPeaks`). |
| `npm run build` | PASS — `prebuild` `templates:index` lalu `tsc --noEmit && vite build`; 45 modules transformed, `dist/assets/index-*.js` 257.11 kB (gzip 80.73 kB), built in ~491 ms, exit 0. |
| `npm run templates:index` | berjalan sebagai prebuild `npm run build`; tidak ada perubahan `public/templates/index.json`. |
| `cargo check` / `npm run tauri:dev` / dev server | NOT RUN — tidak ada perubahan Rust; dev server dilarang oleh instruksi task. |

## Hal yang belum beres / batasan

- **Alur GUI impor audio tidak bisa dites otomatis**: butuh dialog file sungguhan / browser; tidak ada infrastruktur component testing di repo. Perilaku dicakup lewat tes unit `computePeaks` + store saja.
- **Waveform hanya muncul setelah impor nyata** — sample project tidak punya peaks; lane menampilkan placeholder sampai pengguna mengimpor audio.
- **`extractAudio` tidak dites** (browser-only sesuai spec; memanggilnya dari vitest node akan gagal karena `window` tidak ada).
- Undo `setAudio` memulihkan `Project.audio` tetapi peaks waveform tidak ikut (display cache) — disengaja sesuai spec; bila pengguna undo setelah impor, `project.audio` kembali ke nilai lama namun canvas masih menampilkan peaks terakhir (dibersihkan hanya jika audio menjadi `null`).
- Durasi playback mengikuti `project.audio.duration` lewat efek sinkron yang sudah ada (tidak diubah di task ini); efek jangka panjangnya pada playhead tidak diverifikasi manual.
