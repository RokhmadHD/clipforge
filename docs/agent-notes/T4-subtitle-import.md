# T4 — Impor subtitle (SRT/VTT/JSON) ke Project.words (laporan agent)

Tanggal: 2026-11-01 · Branch: `agent/t4-subtitles`

## Tujuan
Impor file subtitle SRT, WebVTT, atau JSON menjadi `Project.words` melalui tombol "Subjudul" di TopBar; penggantian words adalah satu langkah undo dan anchor clip di-clamp agar tidak menggantung.

## File yang diubah/dibuat

- `src/lib/subtitles.ts` (baru) — parser murni:
  - `parseSrt(text)`, `parseVtt(text)`, `parseSubtitleJson(text)` → `Word[]` (`{text, start, end}` dalam detik), sudah di-sort by `start`.
  - `parseSubtitleFile(filename, text): ParseResult` — dispatcher per ekstensi, bentuk hasil sama dengan `parseProjectFile` di `src/lib/projectFile.ts` (`{ok:true, words}` | `{ok:false, error}`), tidak pernah throw.
  - Timestamp: `HH:MM:SS[,|.]mmm` dan `MM:SS[.,]mmm` (jam opsional, gaya VTT). Teks cue multi-baris digabung jadi kata-kata berurutan; durasi cue dibagi rata (`duration / wordCount` per kata).
  - SRT: baris indeks opsional (dicari baris yang berisi `-->`, sisanya diabaikan). VTT: blok `WEBVTT`/`NOTE`/`STYLE`/`REGION` diabaikan, cue id & cue settings (`position:50%` dsb.) ditoleransi.
  - JSON: menerima `{words:[{text,start,end}]}`, array `{text,start,end}`, atau array tuple `[text,start,end]`. Validasi: text string non-kosong, start/end angka finite, non-negatif, `start < end` — pelanggaran melempar Error berbahasa Indonesia dengan indeks kata (`Kata #N: ...`).
  - Hasil kosong → error "Tidak ada cue subtitle yang bisa dibaca dari file ini."
- `src/lib/subtitles.test.ts` (baru) — 14 tes: SRT multi-line + millis koma, indeks opsional + millis titik + CRLF, tanpa cue → []; VTT header/NOTE/STYLE diabaikan + cue id + settings + timestamp penuh; JSON tiga bentuk + sort; rejection (JSON rusak, bentuk tak dikenal, text kosong, start>=end, negatif, non-finite); dispatcher (dispatch per ekstensi + sort, fallback .txt, tanpa throw untuk semua kasus gagal).
- `src/stores/projectStore.ts` — action baru `setWords(words: Word[])`: mutasi undoable sungguhan lewat `commit(..., key: null)` (tidak pernah coalesce), menandai `dirty`. Dalam project yang SAMA yang di-commit, setiap `from.word`/`to.word` di clamp ke `0..len-1` (edge & offset dipertahankan), jadi anchor tidak pernah menggantung. JSDoc interface `ProjectState` diperbarui.
- `src/stores/projectStore.test.ts` — suite baru `projectStore.setWords` (3 tes): mengganti words + dirty; satu langkah undo (undo mengembalikan snapshot lama by reference, redo memulihkan state baru); clamp anchor di luar jangkauan dengan edge/offset dipertahankan.
- `src/components/layout/TopBar.tsx` — tombol "Subjudul" di sebelah "Buka", memakai pola hidden-file-input yang sama (`accept=".srt,.vtt,.txt,.json,application/json"`); sukses → `setWords(result.words)`, gagal → error ditampilkan di slot `.save-error` yang sama (state `subtitleError` terpisah dari `openError`, ditampilkan lebih dulu). Tombol "Simpan" kini memanggil `saveCurrentProject()` (handler bersama), selektor `markSaved` dan import `downloadProjectFile` dihapus dari TopBar.
- `src/lib/useHotkeys.ts` — fungsi ekspor baru `saveCurrentProject()` (logika Simpan yang dipindah: `downloadProjectFile(project)` + `markSaved()`), dan hotkey Ctrl/Cmd+S di handler `onKeyDown` yang sama: `preventDefault()` lalu memanggil `saveCurrentProject()`. Signature hook tidak berubah, jadi `App.tsx` tidak perlu disentuh.
- `docs/agent-notes/T4-subtitle-import.md` — laporan ini.

Tidak ada file lain yang disentuh (`docs/STATUS.md`, `package.json`, `src/types/**`, `src/App.tsx` tidak diubah). Tidak ada dependency baru.

## Keputusan desain

- **Parser murni + dispatcher tanpa throw.** `parseSrt`/`parseVtt`/`parseSubtitleJson` mengembalikan `Word[]` (JSON melempar `Error` berbahasa Indonesia untuk input tidak valid); semua kegagalan ditangkap di `parseSubtitleFile` dan diubah menjadi `{ok:false, error}` — bentuk hasil identik dengan `parseProjectFile`, jadi pola pemakaian di TopBar sama persis dengan Buka.
- **Pembagian waktu kata rata.** Kata-kata satu cue (semua baris digabung) mendapat irisan `duration / wordCount` berurutan; ini kompromi sederhana tanpa data per-kata dari file SRT/VTT. Cue tanpa token teks di-skip.
- **`.txt` diterima sebagai SRT-then-VTT.** `accept` di spec menyertakan `.txt`, tetapi "unknown extension" harus ditolak. Kompromi: `.txt` dicoba sebagai SRT dulu, lalu VTT; jika keduanya kosong → error generic. Ekstensi lain (mis. `.docx`, tanpa ekstensi) ditolak dengan pesan jelas.
- **Clamp di dalam snapshot yang di-commit.** `setWords` tidak melakukan dua commit (words, lalu clamp) — anchor di-clamp saat membangun project baru yang sama, sehingga satu undo step dan snapshot riwayat konsisten. Konsekuensi: redo memulihkan state baru yang sudah di-clamp (bukan snapshot lama), dan undo tetap mengembalikan snapshot lama utuh (by reference) — keduanya dites.
- **Logika Simpan dipindah ke `saveCurrentProject()` di `useHotkeys.ts`.** Batasan file melarang menyentuh `App.tsx` dan membuat file baru, sehingga fungsi bersama ditempatkan di `useHotkeys.ts` (tempat hotkey Ctrl+S hidup) dan diimpor TopBar untuk tombol Simpan — tidak ada duplikasi, tidak ada listener ganda (TopBar tidak memasang `useHotkeys` sendiri). Prop callback opsional tidak dipakai karena tidak ada pemanggil baru yang bisa menyuplainya.
- **Ctrl+S mengikuti aturan T1**: diabaikan saat fokus di `input`/`textarea`/`select`/`contenteditable`, konsisten dengan undo/redo yang sudah ada.
- **Error subtitle terpisah dari error buka proyek** (`subtitleError` vs `openError`) tetapi berbagi slot render `.save-error`; error subtitle ditampilkan lebih dulu bila keduanya ada.

## Hasil validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS — `tsc --noEmit` bersih, exit 0. |
| `npm run test` | PASS — 105 tests / 9 files, semua hijau (88 lama tetap hijau; +14 `subtitles.test.ts`, +3 baru di `projectStore.test.ts`). |
| `npm run build` | PASS — `tsc --noEmit && vite build`, 44 modules, built in ~343 ms, exit 0. |
| `npm run templates:index` | NOT RUN — tidak ada perubahan manifest template (build prebuild tidak menampilkan perubahan `public/templates/index.json`). |
| `cargo check` / `npm run tauri:dev` | NOT RUN — tidak ada perubahan Rust; dev server tidak dijalankan sesuai instruksi task. |

## Hal yang belum beres / batasan

- Tidak ada tes DOM untuk TopBar/useHotkeys (belum ada infrastruktur component testing di repo); perilaku UI (klik Subjudul, error slot) hanya dicakup lewat tes unit parser + store.
- Pembagian waktu rata antar kata dalam satu cue adalah aproksimasi; karaoke presisi per kata tetap butuh forced alignment (M3).
- `.txt` dipakai sebagai SRT lalu VTT — file VTT bernama `.txt` yang gagal parse SRT tetap diterima, tetapi file teks biasa yang kebetulan mengandung `-->` bisa salah terbaca.
- Ctrl/Cmd+S tidak aktif saat fokus di field editable (konsisten dengan aturan hotkey T1); default browser (save dialog) tidak dicegah dalam kasus itu.
