import { useEffect, useMemo, useRef, useState } from "react";
import { resolveClip, wordsInWindow } from "../../lib/anchors";
import { formatTime } from "../../lib/format";
import { buildTemplateUrl, withDefaults, type TemplateWindow } from "../../lib/templates";
import type { Clip } from "../../types/project";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useProjectStore } from "../../stores/projectStore";
import { useTemplateStore } from "../../stores/templateStore";

interface PreviewLayer {
  clip: Clip;
  start: number;
  end: number;
  url: string;
}

export function PreviewStage() {
  const project = useProjectStore((s) => s.project);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const time = usePlaybackStore((s) => s.time);
  const playing = usePlaybackStore((s) => s.playing);
  const duration = usePlaybackStore((s) => s.duration);
  const seek = usePlaybackStore((s) => s.seek);
  const toggle = usePlaybackStore((s) => s.toggle);
  const pause = usePlaybackStore((s) => s.pause);
  const templates = useTemplateStore((s) => s.templates);
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const stageAreaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layers = useMemo<PreviewLayer[]>(() => {
    const theme = project.themes.find((item) => item.id === project.activeThemeId)?.tokens ?? {};
    const clips = [...project.scenes, ...project.overlays];

    return clips.flatMap((clip) => {
      const manifest = templates.find((item) => item.id === clip.template);
      if (!manifest) return [];

      const resolved = resolveClip(project.words, clip, project.audio?.duration ?? 0);
      if (resolved.duration <= 0) return [];

      const params = withDefaults(manifest, clip.params);
      const words = manifest.needsWords
        ? wordsInWindow(project.words, resolved.start, resolved.end)
        : undefined;
      const url = buildTemplateUrl({
        id: clip.template,
        params,
        theme,
        duration: resolved.duration,
        ...(words ? { words } : {}),
      });

      return [{ clip, start: resolved.start, end: resolved.end, url }];
    });
  }, [project, templates]);

  const visibleLayers = layers.filter(
    (layer) => time >= layer.start && time < layer.end,
  );

  useEffect(() => {
    for (const layer of visibleLayers) {
      const frame = frames.current[layer.clip.id];
      const templateWindow = frame?.contentWindow as TemplateWindow | null | undefined;
      templateWindow?.__seek?.(Math.max(0, time - layer.start));
    }
  }, [time, visibleLayers]);

  const width = project.meta.width || 1080;
  const height = project.meta.height || 1920;
  // Scale the frame to the available center panel; 360x640 stays the display ceiling.
  const scale = Math.min(
    Math.min(area.w > 0 ? area.w : 360, 360) / width,
    Math.min(area.h > 0 ? area.h : 640, 640) / height,
  );
  const selectedLayer = layers.find((layer) => layer.clip.id === selectedClipId);
  const hasTemplates = templates.length > 0;

  return (
    <section className="preview" aria-label="Preview video">
      <div className="stage-area" ref={stageAreaRef}>
        <div
          className="stage"
          style={{ width: Math.round(width * scale), height: Math.round(height * scale), aspectRatio: `${width} / ${height}` }}
        >
          <div
            className="stage-inner"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
            }}
          >
            {visibleLayers.map((layer) => (
              <iframe
                key={`${layer.clip.id}:${layer.url}`}
                ref={(node) => {
                  frames.current[layer.clip.id] = node;
                }}
                src={layer.url}
                title={`Preview ${layer.clip.template}`}
                sandbox="allow-scripts allow-same-origin"
                tabIndex={-1}
                onLoad={(event) => {
                  const frameWindow = event.currentTarget.contentWindow as TemplateWindow | null;
                  const localTime = Math.max(0, usePlaybackStore.getState().time - layer.start);
                  void frameWindow?.__ready?.then(() => frameWindow?.__seek?.(localTime));
                }}
              />
            ))}
          </div>
          {visibleLayers.length === 0 && (
            <div className="stage-note">
              {!hasTemplates
                ? "Memuat template preview…"
                : selectedLayer
                  ? "Clip tidak aktif pada posisi playhead"
                  : "Belum ada clip pada posisi ini"}
            </div>
          )}
        </div>
      </div>

      <div className="transport">
        <button
          className="btn"
          type="button"
          onClick={playing ? pause : toggle}
          disabled={duration <= 0}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <span className="mono">{formatTime(time)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.01)}
          step={0.01}
          value={Math.min(time, duration)}
          onChange={(event) => {
            pause();
            seek(Number(event.currentTarget.value));
          }}
          aria-label="Posisi playback"
        />
        <span className="mono">{formatTime(duration)}</span>
      </div>
    </section>
  );
}
