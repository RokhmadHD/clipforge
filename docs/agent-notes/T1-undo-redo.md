# T1 — Undo/Redo untuk Project (laporan agent)

Tanggal: 2026-11-02 · Branch: `agent/t1-undo-redo` · Agent: opencode (`zgateway/glm-5.3`)

## File yang diubah/dibuat

- `src/lib/history.ts` (baru) — mesin riwayat murni: `createHistory`, `pushHistory`, `undoHistory`, `redoHistory`, `canUndoHistory`, `canRedoHistory`; konstanta `HISTORY_LIMIT = 100`, `COALESCE_WINDOW_MS = 500`.
- `src/lib/history.test.ts` (baru) — tes murni: dasar push/undo/redo, redo dikosongkan mutasi baru, batas 100, coalescing dalam/luar jendela 500 ms (waktu disuntikkan).
- `src/stores/projectStore.ts` — setiap mutasi project (`setClipParam`, `addClip`, `deleteClip`, `duplicateClip`, `setClipAnchors`, `shiftClip`) dikommit lewat helper `commit()` yang memanggil `pushHistory`. API baru: `undo()`, `redo()`, `canUndo`, `canRedo`, `resetHistory()`, plus `setProject()` (membuka project baru → riwayat baru; disiapkan untuk task save/open). `selectClip` tidak menyentuh riwayat.
- `src/stores/projectStore.test.ts` — suite baru `projectStore undo/redo` (10 tes, `vi.useFakeTimers` untuk jendela coalescing); helper `reset` diperbarui agar mereset state riwayat.
- `src/components/layout/TopBar.tsx` — dua tombol kecil `↶ Undo` / `↷ Redo` (kelas `btn small`, disabled mengikuti `canUndo`/`canRedo`, tooltip shortcut).
- `src/lib/useHotkeys.ts` (baru) — hook global: Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z dan Ctrl+Y redo; diabaikan saat fokus di `input`/`textarea`/`select`/`contenteditable`.
- `src/App.tsx` — hanya memasang `useHotkeys` (baris 17–20).
- `docs/agent-notes/T1-undo-redo.md` — laporan ini.

Tidak ada file lain yang disentuh; `src/types/**` tidak diubah.

## Keputusan desain

- **Snapshot by reference.** `Project` sudah dimutasi secara immutable di store, jadi `history.ts` hanya menyimpan referensi snapshot — tanpa deep clone.
- **Logika murni terpisah.** Semua aturan riwayat (batas 100, coalescing 500 ms, undo/redo stack) ada di `history.ts` sebagai fungsi murni dengan waktu disuntikkan (`now: number`), jadi bisa dites tanpa timer sungguhan. Store hanya memasok `Date.now()`.
- **Coalescing key** sesuai spec: `param:<clipId>:<key>`, `move:<clipId>`, `anchors:<clipId>`; push dengan key `null` (add/delete/duplicate) tidak pernah digabung. Coalescing bekerja dengan TIDAK menambah snapshot past baru (step sebelumnya sudah merekam kondisi pra-edit), sehingga satu undo mengembalikan seluruh burst.
- **Satu sumber kebenaran.** Riwayat menyimpan `Project` saja; `selectedClipId` tidak masuk snapshot. Setelah undo/redo, jika clip terpilih tidak ada lagi di snapshot aktif, selection di-set `null` (persyaratan 6).
- **`history` ikut di state store** (bukan variabel modul) supaya `setState` di tes/`setProject` tetap konsisten; `canUndo`/`canRedo` adalah boolean turunan yang di-update pada setiap transisi.
- **`setProject()` tambahan** (di luar daftar mutasi wajib): pengganti aman `setState` manual untuk task save/open berikutnya — mengganti project sekaligus mereset riwayat dan membersihkan selection yang hilang. Spec melarang menyentuh file lain, jadi tidak ada caller UI baru.
- **Hotkeys di hook terpisah** (`useHotkeys`) agar `App.tsx` hanya memasang hook, sesuai batasan file. Modifier: `ctrlKey || metaKey` (Cmd di macOS).

## Hasil validasi

| Perintah | Hasil |
|---|---|
| `npm install` | PASS — `node_modules` belum ada saat mulai; 0 vulnerabilities. |
| `npm run typecheck` | PASS — `tsc --noEmit` bersih. |
| `npm run test` | PASS — 62 tests / 6 files (sebelumnya 44; +18 baru: 8 di `history.test.ts`, 10 di `projectStore.test.ts`). Semua tes lama tetap hijau. |
| `npm run build` | PASS — Vite production build selesai. |
| `npm run templates:index` | NOT RUN — tidak ada perubahan manifest template. |
| `cargo check` / `npm run tauri:dev` | NOT RUN — tidak ada perubahan Rust; tetap diblok environment `glib-2.0` sesuai handoff. |
| Smoke test browser manual | NOT RUN — perubahan UI TopBar minimal (dua tombol); perilaku dicakup tes unit store. |

## Hal yang belum beres / batasan

- Undo/redo tidak tersambung ke "membuka project baru" karena project save/open belum ada (T lain); `resetHistory()`/`setProject()` sudah disiapkan untuk itu.
- Tidak ada tes DOM untuk `useHotkeys` (belum ada infrastruktur component testing di repo; hanya unit test vitest).
- Snapshot menyimpan referensi objek `Project`; aman selama semua mutasi tetap immutable — pelanggaran imutabilitas di masa depan akan merusak riwayat secara diam-diam.
- Tauri desktop shell tetap belum terverifikasi (blokir environment, bukan perubahan ini).
