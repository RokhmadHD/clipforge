import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { wordIndexAtTime } from "../../lib/insert";
import { buildTemplateUrl, withDefaults } from "../../lib/templates";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useProjectStore } from "../../stores/projectStore";
import { useTemplateStore } from "../../stores/templateStore";
import type { TemplateManifest } from "../../types/template";
import type { Word } from "../../types/project";

type Category = "all" | TemplateManifest["kind"];

/** Demo words so word-driven templates show something in their static tile preview. */
const PREVIEW_WORDS: Word[] = [
  { text: "Contoh", start: 0, end: 0.5 },
  { text: "Caption", start: 0.5, end: 1 },
];

export function MaterialLibrary() {
  const templates = useTemplateStore((s) => s.templates);
  const status = useTemplateStore((s) => s.status);
  const error = useTemplateStore((s) => s.error);
  const addClip = useProjectStore((s) => s.addClip);
  const words = useProjectStore((s) => s.project.words);
  const theme = useProjectStore(
    (s) => s.project.themes.find((t) => t.id === s.project.activeThemeId)?.tokens ?? {},
  );
  const time = usePlaybackStore((s) => s.time);
  const pause = usePlaybackStore((s) => s.pause);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const [thumbScale, setThumbScale] = useState(0.13);

  const categories = useMemo<Category[]>(() => {
    const kinds = new Set(templates.map((t) => t.kind));
    return ["all", ...(["scene", "overlay"] as const).filter((k) => kinds.has(k))];
  }, [templates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "all" && t.kind !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    });
  }, [templates, query, category]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => {
      const thumb = grid.querySelector<HTMLElement>(".thumb");
      if (thumb && thumb.clientWidth > 0) setThumbScale(thumb.clientWidth / 1080);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [visible]);

  const canInsert = words.length > 0;

  const insert = (template: TemplateManifest) => {
    if (!canInsert) return;
    pause();
    addClip(template, wordIndexAtTime(words, time));
  };

  const previewUrl = (template: TemplateManifest) =>
    buildTemplateUrl({
      id: template.id,
      params: withDefaults(template, {}),
      theme,
      duration: template.defaultDuration,
      ...(template.needsWords ? { words: PREVIEW_WORDS } : {}),
    });

  return (
    <aside className="panel library" aria-label="Perpustakaan template">
      <div className="panel-title">Material Library</div>

      <div className="library-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Cari template…"
          aria-label="Cari template"
        />
      </div>

      <div className="library-filters" role="group" aria-label="Filter kategori">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c === "all" ? "All" : c === "scene" ? "Scene" : "Overlay"}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="empty">Memuat template…</p>}
      {status === "error" && (
        <p className="empty error" role="alert">
          Gagal memuat template: {error ?? "Terjadi kesalahan."}
        </p>
      )}
      {status === "ready" && templates.length === 0 && (
        <p className="empty">Belum ada template. Tambahkan template ke folder public/templates.</p>
      )}
      {status === "ready" && templates.length > 0 && visible.length === 0 && (
        <p className="empty">Tidak ada template yang cocok dengan pencarian.</p>
      )}

      {visible.length > 0 && (
        <div className="grid" ref={gridRef} style={{ "--thumb-scale": thumbScale } as CSSProperties}>
          {visible.map((template) => (
            <article className="card" key={template.id}>
              <div className="thumb" aria-hidden="true">
                <iframe
                  src={previewUrl(template)}
                  sandbox="allow-scripts allow-same-origin"
                  tabIndex={-1}
                  loading="lazy"
                  title=""
                />
              </div>
              <span className="name" title={template.name}>{template.name}</span>
              <div className="badges">
                <span className={`badge ${template.kind === "overlay" ? "kind" : ""}`}>
                  {template.kind === "scene" ? "Scene" : "Overlay"}
                </span>
                <span className="badge">{template.size[0]}×{template.size[1]}</span>
              </div>
              <div className="card-foot">
                <span className="muted">{template.defaultDuration}s · {template.fps} FPS</span>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => insert(template)}
                  disabled={!canInsert}
                  title={canInsert ? `Tambahkan ${template.name} ke timeline pada posisi playhead` : "Proyek belum memiliki word timing"}
                >
                  + Insert
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
