// ClipForge renderer sidecar -- DRAFT for milestone M1 (not yet run end-to-end).
//
// Pipeline: open a template in headless Chromium -> for each frame call
// window.__seek(t) -> screenshot PNG -> pipe into FFmpeg.
//   *.webm output -> transparent overlay (VP9 + alpha)
//   *.mp4  output -> opaque, composited on --bg (default dark) for quick checks
//
// Usage:
//   node renderer/render.mjs --template public/templates/fact-card \
//        --out samples/fact-card.mp4 --duration 3 [--fps 30] \
//        [--params '{"title":"1883"}'] [--words '[{"text":"a","start":0,"end":.4}]'] \
//        [--theme '{"--cf-accent":"#7C5CFF"}'] [--bg "#14161c"]
//
// Env: CHROME_PATH (chromium/chrome binary), FFMPEG_PATH (default "ffmpeg").
// Progress is emitted on stdout as JSON lines: {"type":"progress","frame":n,"total":N}
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const die = (msg) => { console.error("render: " + msg); process.exit(1); };

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) o[argv[i].replace(/^--/, "")] = argv[i + 1];
  return o;
}

const args = parseArgs(process.argv.slice(2));
if (!args.template || !args.out) die("--template and --out are required");

const fps = Number(args.fps ?? 30);
const duration = Number(args.duration ?? 3);
const total = Math.round(duration * fps);
const alpha = args.out.endsWith(".webm");
const bg = args.bg ?? "#14161c";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

const chrome = [
  process.env.CHROME_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].find((p) => p && existsSync(p));
if (!chrome) die("no Chromium/Chrome found; set CHROME_PATH");

const url = pathToFileURL(resolve(args.template, "index.html"));
url.searchParams.set("p", args.params ?? "{}");
url.searchParams.set("theme", args.theme ?? "{}");
url.searchParams.set("w", args.words ?? "[]");
url.searchParams.set("d", String(duration));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--hide-scrollbars", "--force-color-profile=srgb", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(url.href, { waitUntil: "load" });
  await page.evaluate(() => window.__ready);
  if (!alpha) await page.addStyleTag({ content: `html,body{background:${bg} !important}` });

  const codec = alpha
    ? ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0"]
    : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"];
  const ff = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", ...codec, args.out], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const closed = once(ff, "close"); // also rejects on spawn error (e.g. ffmpeg not found)

  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.__seek(t), f / fps);
    const png = await page.screenshot({ type: "png", omitBackground: alpha });
    if (!ff.stdin.write(png)) await once(ff.stdin, "drain");
    if (f % 10 === 0 || f === total - 1) console.log(JSON.stringify({ type: "progress", frame: f + 1, total }));
  }
  ff.stdin.end();
  const [code] = await closed;
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  console.log(JSON.stringify({ type: "done", out: args.out }));
} finally {
  await browser.close();
}
