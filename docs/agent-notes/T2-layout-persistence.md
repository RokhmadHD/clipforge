# T2 — Persistensi layout editor panel (laporan agent)

Tanggal: 2026-11-01 · Branch: `agent/t2-layout-persistence`

## Tujuan
Layout panel editor (`libraryWidth`, `inspectorWidth`, `timelineHeight`) di `uiStore` sekarang dipersist ke `localStorage` di bawah key `clipforge.ui.layout.v1`, dimuat ulang saat store diinisialisasi, dan tahan terhadap data korup / storage gagal.

## File yang diubah/dibuat

- `src/lib/layoutStorage.ts` (baru) — layer storage ter-injectable: interface `LayoutStorage`, konstanta `LAYOUT_STORAGE_KEY = "clipforge.ui.layout.v1"`, `loadLayout(storage, key)` (parse aman, hanya menerima field numeric finite, tidak pernah throw), `saveLayout(storage, key, layout)` (write dibungkus try/catch, kegagalan ditelan), `createLocalStorage()` (default app; fallback ke in-memory bila `window.localStorage` tidak ada, mis. lingkungan test/SSR), dan `createInMemoryLayoutStorage()` (helper test).
- `src/lib/layoutStorage.test.ts` (baru) — 8 tes: round-trip in-memory storage, parse field numeric saja, `{}` untuk JSON korup / payload non-object / `getItem` throw, save sebagai JSON, dan `setItem` yang throw tidak memunculkan exception.
- `src/stores/uiStore.ts` — `useUiStore` sekarang dibuat lewat factory `createUiStore(storage: LayoutStorage = createLocalStorage())`. Saat init, store memanggil `loadInitialLayout(storage)`: setiap nilai yang ada di storage di-clamp ke `LAYOUT_LIMITS`, nilai yang hilang/korup/out-of-range jatuh ke `LAYOUT_DEFAULTS`. Ketiga setter (`setLibraryWidth`, `setInspectorWidth`, `setTimelineHeight`) memanggil `saveLayout` pada setiap panggilan (nilai yang disimpan sudah di-clamp). `mode` dan `setMode` tidak berubah; tidak ada dependency baru.
- `src/stores/uiStore.test.ts` — suite lama tetap utuh; ditambah suite baru "uiStore layout persistence" (6 tes) memakai `createUiStore(createInMemoryLayoutStorage())`: persist saat set, nilai tersimpan sudah di-clamp, load nilai persist saat pembuatan store, clamp nilai out-of-range, fallback ke default pada JSON korup & field parsial, dan kegagalan save ditelan tanpa throw (state tetap ter-update).
- `docs/agent-notes/T2-layout-persistence.md` — laporan ini.

Tidak ada file lain yang disentuh (`docs/STATUS.md`, `docs/SESSION_HANDOFF.md`, `docs/ROADMAP.md`, `package.json`, `src/components/**`, `src/App.tsx` tidak diubah).

## Keputusan desain

- **Storage di-inject, bukan di-mock.** Pola mengikuti T1 (waktu disuntikkan di `history.ts`): `createUiStore(storage)` menerima `LayoutStorage`, dan default parameternya `createLocalStorage()`. Export lama `useUiStore` tetap dipakai semua caller yang ada tanpa perubahan.
- **Validasi dipisah dari clamp.** `layoutStorage.ts` hanya menentukan apakah sebuah field "layak dipakai" (angka finite); clamp ke `LAYOUT_LIMITS` tetap di `uiStore.ts` dekat konstantanya. Ini menghindari import siklik (uiStore → layoutStorage → uiStore).
- **Nilai parsial diperbolehkan.** Bila storage berisi layout lama yang hanya punya sebagian field, field yang valid dipakai dan sisanya ke default — tidak ada all-or-nothing, jadi skema key bisa bertambah nanti tanpa memecah data lama.
- **Kegagalan save tidak mengubah state.** Setter tetap meng-update in-memory state walau persist gagal (quota penuh, storage nonaktif); `saveLayout` menelan error. Bila `saveLayout` gagal sebelum `set(...)`, urutan tetap aman karena `persist()` membangun snapshot layout dari `get()` sebelum `set`.
- **Fallback in-memory di `createLocalStorage`.** Test berjalan di environment node tanpa jsdom (`vitest` default), jadi default storage tidak boleh melempar saat `window` tidak ada. Di Tauri/`vite build` selalu ada `window.localStorage`, jadi fallback hanya relevan untuk test dan edge case non-browser.
- **`useUiStore.setState` (dipakai tes lama) tidak memicu save** karena persist hanya ada di dalam setter fungsi store — perilaku tes lama tidak berubah.

## Hasil validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS — `tsc --noEmit` bersih, exit 0. |
| `npm run test` | PASS — 76 tests / 7 files, semua hijau (sebelumnya 62: +8 `layoutStorage.test.ts`, +6 baru di `uiStore.test.ts`; seluruh tes lama termasuk T1 tetap hijau). |
| `npm run build` | PASS — `prebuild` `templates:index` (indexed 2, tanpa perubahan `public/templates/index.json`) lalu `tsc --noEmit && vite build`, built in ~366 ms, exit 0. |
| `cargo check` / `npm run tauri:dev` | NOT RUN — tidak ada perubahan Rust; dev server tidak dijalankan sesuai instruksi task. |

## Hal yang belum beres / batasan

- Persistensi belum terverifikasi manual di desktop app (tidak menjalankan `npm run dev`/`tauri:dev` sesuai batasan task); perilaku reload dicakup oleh tes unit store dengan storage in-memory.
- `mode` ("assets"/"storyboard"/"editor") sengaja tidak dipersist — hanya tiga nilai layout sesuai spec.
- Bila di masa depan ada field layout baru, key `clipforge.ui.layout.v1` tidak punya mekanisme versi/migrasi eksplisit; field tak dikenal diabaikan dengan aman oleh `loadLayout`.
