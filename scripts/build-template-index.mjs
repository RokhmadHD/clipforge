// Scans public/templates/*/manifest.json, validates the essentials and writes
// public/templates/index.json (consumed by the frontend). Fails loudly on a
// broken template so mistakes surface at dev/build time, not at render time.
// Contract: docs/TEMPLATE_CONTRACT.md
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "public/templates";
const KINDS = new Set(["scene", "overlay"]);
const PARAM_TYPES = new Set(["text", "color", "number", "enum"]);

const errors = [];
const manifests = [];

for (const id of readdirSync(ROOT).sort()) {
  const dir = join(ROOT, id);
  if (!statSync(dir).isDirectory()) continue;
  const fail = (msg) => errors.push(`[${id}] ${msg}`);

  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) { fail("manifest.json missing"); continue; }
  if (!existsSync(join(dir, "index.html"))) fail("index.html missing");

  let m;
  try { m = JSON.parse(readFileSync(manifestPath, "utf8")); }
  catch (e) { fail(`manifest.json is not valid JSON: ${e.message}`); continue; }

  if (m.id !== id) fail(`manifest.id ("${m.id}") must equal folder name`);
  if (!KINDS.has(m.kind)) fail(`kind must be one of ${[...KINDS].join("|")}`);
  if (!Array.isArray(m.size) || m.size.length !== 2) fail("size must be [width, height]");
  if (typeof m.defaultDuration !== "number") fail("defaultDuration (seconds) required");
  for (const [key, spec] of Object.entries(m.params ?? {})) {
    if (!PARAM_TYPES.has(spec.type)) fail(`param "${key}" has unknown type "${spec.type}"`);
    if (spec.type === "enum" && !Array.isArray(spec.values)) fail(`param "${key}" enum needs values[]`);
  }
  manifests.push(m);
}

if (errors.length) {
  console.error("Template validation failed:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

writeFileSync(join(ROOT, "index.json"), JSON.stringify(manifests, null, 2) + "\n");
console.log(`templates: indexed ${manifests.length} (${manifests.map((m) => m.id).join(", ")})`);
