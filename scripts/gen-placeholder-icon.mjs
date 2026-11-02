// Generates a placeholder 512x512 app icon (violet square + white play triangle)
// at src-tauri/icons/icon.png. Replace later with real artwork, then run:
//   npx tauri icon path/to/source.png
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const S = 512;
const rows = [];
for (let y = 0; y < S; y++) {
  const row = Buffer.alloc(1 + S * 4); // filter byte + RGBA
  for (let x = 0; x < S; x++) {
    const i = 1 + x * 4;
    // play triangle: (176,128) (176,384) (396,256)
    const inTri = x >= 176 && x <= 396 && Math.abs(y - 256) <= (128 * (396 - x)) / 220;
    const [r, g, b] = inTri ? [255, 255, 255] : [0x7c, 0x5c, 0xff];
    row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = 255;
  }
  rows.push(row);
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(Buffer.concat(rows))),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync("src-tauri/icons", { recursive: true });
writeFileSync("src-tauri/icons/icon.png", png);
console.log("wrote src-tauri/icons/icon.png", png.length, "bytes");
