// Dev helper: lists model ids exposed by the "zgateway" provider in the user's
// global opencode config (~/.config/opencode/opencode.json). Never prints the key.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const cfg = JSON.parse(readFileSync(`${homedir()}/.config/opencode/opencode.json`, "utf8"));
const o = cfg.provider.zgateway.options;
try {
  const r = await fetch(`${o.baseURL}/models`, { headers: { Authorization: `Bearer ${o.apiKey}` } });
  console.log("HTTP", r.status);
  const t = await r.text();
  try {
    const j = JSON.parse(t);
    console.log((j.data ?? []).map((m) => m.id).join("\n") || t.slice(0, 300));
  } catch {
    console.log(t.slice(0, 300));
  }
} catch (e) {
  console.log("ERR", e.message);
}
