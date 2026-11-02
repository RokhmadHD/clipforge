# T1: Undo/redo untuk project

Agent: opencode (`zgateway/glm-5.3`). Branch: `agent/t1-undo-redo`.
Spec ini MENGALAHKAN instruksi di `AGENTS.md` soal mengubah `docs/STATUS.md`: jangan edit `docs/**` (kecuali `docs/agent-notes/`). Tulis laporan di `docs/agent-notes/T1-undo-redo.md`.

## Tujuan
Tambahkan riwayat undo/redo untuk `Project` di `projectStore`, terhubung ke tombol Undo/Redo dan shortcut keyboard.

## File yang boleh diubah/dibuat
- `src/lib/history.ts` + `src/lib/history.test.ts` (logika murni, tanpa React/zustand)
- `src/stores/projectStore.ts` + `src/stores/projectStore.test.ts`
- `src/components/layout/TopBar.tsx` (hubungkan tombol Undo/Redo jika ada; jika belum ada, tambahkan dua tombol kecil)
- `src/lib/useHotkeys.ts` (baru) dan `src/App.tsx` (hanya untuk memasang hook ini)
- `docs/agent-notes/T1-undo-redo.md`
Jangan sentuh file lain. `src/types/**` tidak boleh diubah.

## Persyaratan
1. Riwayat menyimpan snapshot `Project` saja (bukan selection, playback, atau state UI). Snapshot immutable, tidak ada deep clone mahal: state project sudah diperbarui secara immutable, cukup simpan referensinya.
2. Batas riwayat 100 langkah; yang tertua dibuang.
3. Setiap mutasi project di `projectStore` (`setClipParam`, `addClip`, `deleteClip`, `duplicateClip`, `setClipAnchors`, `shiftClip`) menjadi satu langkah undo. Mutasi baru mengosongkan stack redo. `selectClip` BUKAN langkah undo.
4. Coalescing: perubahan beruntun yang sama dalam 500 ms digabung jadi satu langkah (kunci: `param:<clipId>:<key>` untuk `setClipParam`, `move:<clipId>` untuk `shiftClip`, `anchors:<clipId>` untuk `setClipAnchors`). Waktu harus bisa disuntikkan ke fungsi murni di `history.ts` agar bisa dites tanpa timer sungguhan.
5. API store: `undo()`, `redo()`, `canUndo`, `canRedo` (boolean di state, ikut diperbarui), `resetHistory()` (untuk dipakai saat membuka project baru nanti).
6. Setelah undo/redo, jika `selectedClipId` tidak ada lagi di project, set ke `null`.
7. Shortcut: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z dan Ctrl+Y = redo. Abaikan saat fokus ada di `input`, `textarea`, `select`, atau elemen `contenteditable`.
8. Jangan membuat sumber kebenaran kedua untuk project. Jangan menambah dependency.

## Tes yang wajib ada (vitest)
- push, undo, redo dasar; redo dikosongkan oleh mutasi baru
- batas 100 langkah
- coalescing dalam dan di luar jendela 500 ms (waktu disuntikkan)
- undo menghapus clip yang baru ditambah; redo mengembalikannya
- selection dibersihkan jika clip hilang setelah undo
- `resetHistory`

## Kriteria selesai
- `npm install` (jika `node_modules` belum ada), lalu `npm run typecheck`, `npm run test`, `npm run build` semua lulus. Laporkan hasil sebenarnya.
- Perilaku lama tidak rusak (tes yang sudah ada tetap hijau).
- Commit kecil di branch kamu. Jangan merge, rebase, atau push.
- `docs/agent-notes/T1-undo-redo.md` berisi: file yang diubah, keputusan desain, hasil tiap perintah validasi, dan hal yang belum beres.
