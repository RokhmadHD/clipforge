import { useMemo } from "react";
import { resolveClip } from "../../lib/anchors";
import { formatTime } from "../../lib/format";
import { withDefaults } from "../../lib/templates";
import { useProjectStore } from "../../stores/projectStore";
import { useTemplateStore } from "../../stores/templateStore";
import type { ParamSpec } from "../../types/template";

function ParameterField({
  name,
  spec,
  value,
  onChange,
}: {
  name: string;
  spec: ParamSpec;
  value: string | number | boolean;
  onChange: (value: string | number) => void;
}) {
  const id = `inspector-${name}`;
  const label = spec.label ?? name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  if (spec.type === "color") {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <div className="color-control">
          <input id={id} type="color" value={String(value)} onChange={(event) => onChange(event.currentTarget.value)} />
          <code>{String(value).toUpperCase()}</code>
        </div>
      </div>
    );
  }

  if (spec.type === "number") {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="number"
          value={Number(value)}
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          onChange={(event) => {
            if (event.currentTarget.value !== "") onChange(Number(event.currentTarget.value));
          }}
        />
      </div>
    );
  }

  if (spec.type === "enum") {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <select id={id} value={String(value)} onChange={(event) => onChange(event.currentTarget.value)}>
          {spec.values.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    );
  }

  if (spec.multiline) {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <textarea id={id} value={String(value)} onChange={(event) => onChange(event.currentTarget.value)} rows={4} />
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={String(value)} onChange={(event) => onChange(event.currentTarget.value)} />
    </div>
  );
}

export function Inspector() {
  const project = useProjectStore((s) => s.project);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const setClipParam = useProjectStore((s) => s.setClipParam);
  const templates = useTemplateStore((s) => s.templates);
  const templateStatus = useTemplateStore((s) => s.status);

  const clip = useMemo(
    () => [...project.scenes, ...project.overlays].find((item) => item.id === selectedClipId),
    [project.scenes, project.overlays, selectedClipId],
  );
  const duplicateClip = useProjectStore((s) => s.duplicateClip);
  const deleteClip = useProjectStore((s) => s.deleteClip);
  const manifest = templates.find((item) => item.id === clip?.template);
  const resolved = clip ? resolveClip(project.words, clip, project.audio?.duration ?? 0) : null;
  const params = clip ? withDefaults(manifest, clip.params) : {};

  return (
    <aside className="panel inspector" aria-label="Inspector">
      <div className="panel-title">Inspector</div>
      {!clip ? (
        <div className="inspector-empty">
          <span className="inspector-empty-icon">◇</span>
          <strong>Belum ada clip dipilih</strong>
          <span>Pilih clip dari timeline untuk mengedit propertinya.</span>
        </div>
      ) : (
        <>
          <div className="inspector-heading">
            <div>
              <span className="eyebrow">{manifest?.kind ?? "Template"}</span>
              <h3>{manifest?.name ?? clip.template}</h3>
              <code>{clip.id}</code>
            </div>
            <span className="inspector-chip">L{clip.lane + 1}</span>
          </div>

          {templateStatus === "loading" && <p className="empty">Memuat parameter template…</p>}
          {!manifest && templateStatus !== "loading" && (
            <p className="empty error">Manifest untuk template “{clip.template}” tidak ditemukan.</p>
          )}

          {manifest && (
            <section className="inspector-section">
              <div className="inspector-section-title">Parameter</div>
              {Object.entries(manifest.params).length === 0 ? (
                <p className="empty">Template ini tidak memiliki parameter.</p>
              ) : (
                Object.entries(manifest.params).map(([key, spec]) => (
                  <ParameterField
                    key={key}
                    name={key}
                    spec={spec}
                    value={params[key] ?? spec.default ?? ""}
                    onChange={(value) => setClipParam(clip.id, key, value)}
                  />
                ))
              )}
            </section>
          )}

          <section className="inspector-section">
            <div className="inspector-section-title">Timing &amp; placement</div>
            <div className="kv">
              <span className="muted">Start</span><code>{resolved ? formatTime(resolved.start) : "—"}</code>
              <span className="muted">End</span><code>{resolved ? formatTime(resolved.end) : "—"}</code>
              <span className="muted">Duration</span><code>{resolved ? formatTime(resolved.duration) : "—"}</code>
              <span className="muted">Lane</span><code>{clip.lane + 1}</code>
              <span className="muted">Anchors</span><code>{clip.from.word} → {clip.to.word}</code>
            </div>
          </section>

          <section className="inspector-section">
            <div className="inspector-section-title">Clip actions</div>
            <div className="inspector-actions">
              <button type="button" className="btn" onClick={() => duplicateClip(clip.id)}>
                Duplicate
              </button>
              <button type="button" className="btn danger" onClick={() => deleteClip(clip.id)}>
                Delete
              </button>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
