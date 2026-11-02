import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { extractAudio } from "../../lib/audio";
import { resolveClip, type ResolvedClip } from "../../lib/anchors";
import { wordIndexAtTime } from "../../lib/insert";
import { formatTime } from "../../lib/format";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUiStore } from "../../stores/uiStore";
import type { Clip, WordAnchor } from "../../types/project";

const TRACKS = [
  { id: "video", label: "Video", kind: "video" },
  { id: "audio", label: "Audio", kind: "audio" },
  { id: "captions", label: "Caption", kind: "captions" },
  { id: "overlay-0", label: "Overlay 1", kind: "overlay", lane: 0 },
  { id: "overlay-1", label: "Overlay 2", kind: "overlay", lane: 1 },
] as const;

/** .tl-row height in CSS; the waveform canvas shrinks by row padding. */
const AUDIO_ROW_HEIGHT = 34;
const AUDIO_ROW_PADDING = 4;
const WAVEFORM_COLOR = "rgba(47, 212, 180, 0.42)";

type DragMode = "move" | "start" | "end";

interface DragState {
  clipId: string;
  mode: DragMode;
  fromAnchor: WordAnchor;
  toAnchor: WordAnchor;
  fromWord: number;
  toWord: number;
  startX: number;
  lastDelta: number;
}

export function Timeline() {
  const project = useProjectStore((s) => s.project);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const selectClip = useProjectStore((s) => s.selectClip);
  const shiftClip = useProjectStore((s) => s.shiftClip);
  const setClipAnchors = useProjectStore((s) => s.setClipAnchors);
  const time = usePlaybackStore((s) => s.time);
  const duration = usePlaybackStore((s) => s.duration);
  const seek = usePlaybackStore((s) => s.seek);
  const pause = usePlaybackStore((s) => s.pause);
  const setAudio = useProjectStore((s) => s.setAudio);
  const audioPeaks = useUiStore((s) => s.audioPeaks);
  const setAudioPeaks = useUiStore((s) => s.setAudioPeaks);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(90);
  const [audioError, setAudioError] = useState<string | null>(null);

  const totalDuration = Math.max(duration, project.audio?.duration ?? 0, 1);
  const canvasWidth = Math.max(600, totalDuration * pixelsPerSecond);
  const words = project.words;
  const clips = useMemo(
    () => [...project.scenes, ...project.overlays].map((clip) => ({
      clip,
      ...resolveClip(project.words, clip, project.audio?.duration ?? totalDuration),
    })),
    [project.scenes, project.overlays, project.words, project.audio?.duration, totalDuration],
  );

  const seekFromPointer = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    pause();
    seek(Math.max(0, Math.min(totalDuration, x / pixelsPerSecond)));
  };

  const hasWaveform = audioPeaks !== null && audioPeaks.length > 0;
  const waveHeight = AUDIO_ROW_HEIGHT - 2 * AUDIO_ROW_PADDING;

  // Redraw the waveform whenever the peaks cache, zoom or timeline width changes.
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || !hasWaveform) return;
    const peaks = audioPeaks as number[];
    const dpr = window.devicePixelRatio || 1;
    // Assigning width/height resets the 2d context transform, so scale AFTER sizing.
    canvas.width = Math.max(1, Math.floor(canvasWidth * dpr));
    canvas.height = Math.max(1, Math.floor(waveHeight * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, waveHeight);
    ctx.fillStyle = WAVEFORM_COLOR;
    const step = canvasWidth / peaks.length;
    const barWidth = Math.max(1, step * 0.7);
    const mid = waveHeight / 2;
    peaks.forEach((peak, i) => {
      const half = Math.max(0.5, peak * mid);
      ctx.fillRect(i * step, mid - half, barWidth, half * 2);
    });
  }, [audioPeaks, hasWaveform, canvasWidth, pixelsPerSecond, waveHeight]);

  // Display cache hygiene: if the project audio is cleared (e.g. setAudio(null)),
  // drop the stale waveform too. Undoing setAudio does not restore peaks.
  useEffect(() => {
    if (project.audio === null && useUiStore.getState().audioPeaks !== null) {
      setAudioPeaks(null);
    }
  }, [project.audio, setAudioPeaks]);

  const importAudio = async (file: File) => {
    try {
      const data = await extractAudio(file);
      setAudio({ path: file.name, duration: data.duration });
      setAudioPeaks(data.peaks);
      setAudioError(null);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Gagal memuat file audio.");
    }
  };

  const wordEdgeTime = (index: number, edge: "start" | "end") => words[index]?.[edge] ?? 0;

  const beginDrag = (event: PointerEvent<HTMLElement>, clip: Clip, mode: DragMode) => {
    if (event.button !== 0 || words.length === 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectClip(clip.id);
    pause();
    dragRef.current = {
      clipId: clip.id,
      mode,
      fromAnchor: { ...clip.from },
      toAnchor: { ...clip.to },
      fromWord: clip.from.word,
      toWord: clip.to.word,
      startX: event.clientX,
      lastDelta: 0,
    };
  };

  const onDragMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaSeconds = (event.clientX - drag.startX) / pixelsPerSecond;

    if (drag.mode === "move") {
      const target = wordIndexAtTime(words, wordEdgeTime(drag.fromWord, "start") + deltaSeconds);
      const delta = target - drag.fromWord;
      if (delta !== drag.lastDelta) {
        drag.lastDelta = delta;
        shiftClip(drag.clipId, delta);
      }
      return;
    }

    if (drag.mode === "end") {
      const target = Math.max(wordIndexAtTime(words, wordEdgeTime(drag.toWord, "end") + deltaSeconds), drag.fromWord);
      if (target !== drag.toWord) {
        drag.toWord = target;
        setClipAnchors(drag.clipId, drag.fromAnchor, { ...drag.toAnchor, word: target });
      }
      return;
    }

    const target = Math.min(wordIndexAtTime(words, wordEdgeTime(drag.fromWord, "start") + deltaSeconds), drag.toWord);
    if (target !== drag.fromWord) {
      drag.fromWord = target;
      setClipAnchors(drag.clipId, { ...drag.fromAnchor, word: target }, drag.toAnchor);
    }
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderClip = (clip: Clip, overlay: boolean) => {
    const resolved: ResolvedClip | undefined = clips.find((item) => item.clip.id === clip.id);
    if (!resolved) return null;
    const selected = selectedClipId === clip.id;
    return (
      <div
        key={clip.id}
        role="button"
        tabIndex={0}
        className={`tl-clip ${overlay ? "overlay-clip" : ""} ${selected ? "selected" : ""}`}
        style={{ left: resolved.start * pixelsPerSecond, width: Math.max(24, resolved.duration * pixelsPerSecond) }}
        title={`${clip.template} · ${formatTime(resolved.start)}–${formatTime(resolved.end)} (geser/ubah lebar untuk memindahkan)`}
        onPointerDown={(event) => beginDrag(event, clip, "move")}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") selectClip(clip.id);
        }}
      >
        <span
          className="tl-handle left"
          onPointerDown={(event) => beginDrag(event, clip, "start")}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        {clip.template}
        {overlay && <span className="tl-clip-duration"> {formatTime(resolved.duration)}</span>}
        <span
          className="tl-handle right"
          onPointerDown={(event) => beginDrag(event, clip, "end")}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
    );
  };

  return (
    <section className="timeline" aria-label="Timeline editor">
      <div className="timeline-toolbar">
        <strong>TIMELINE</strong>
        <span className="timeline-tool muted">↖ Select</span>
        <button type="button" className="btn small" onClick={() => audioInputRef.current?.click()} title="Impor audio mp3/wav/ogg/m4a/flac untuk lane Audio">
          Audio
        </button>
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.m4a,.flac,audio/*"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importAudio(file);
            event.currentTarget.value = "";
          }}
        />
        <span className="timeline-timecode mono">TC {formatTime(time)}</span>
        <div className="timeline-zoom">
          <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => setPixelsPerSecond((v) => Math.max(30, v - 15))}>−</button>
          <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => setPixelsPerSecond((v) => Math.min(240, v + 15))}>+</button>
        </div>
      </div>
      <div className="timeline-body">
        <div className="tl-labels">
          {TRACKS.map((track) => (
            <div className="tl-label" key={track.id}>
              <span>{track.label}</span>
              {track.kind === "overlay" && <span className="track-lane">L{(track.lane ?? 0) + 1}</span>}
            </div>
          ))}
        </div>
        <div className="tl-scroll" ref={scrollRef}>
          <div className="tl-canvas" style={{ width: canvasWidth }}>
            <div className="tl-ruler" onClick={seekFromPointer} role="presentation">
              {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, second) => (
                <div className="tl-tick" key={second} style={{ left: second * pixelsPerSecond }}>
                  {second % 2 === 0 ? formatTime(second) : ""}
                </div>
              ))}
            </div>

            {TRACKS.map((track) => (
              <div className={`tl-row tl-row-${track.kind}`} key={track.id} onClick={track.kind === "audio" ? seekFromPointer : undefined}>
                {track.kind === "audio" && (
                  audioError ? (
                    <div className="audio-placeholder error" role="alert">{audioError}</div>
                  ) : hasWaveform ? (
                    <canvas
                      ref={waveformRef}
                      className="audio-waveform"
                      style={{ width: canvasWidth, height: waveHeight }}
                      aria-label={`Waveform ${project.audio?.path ?? "audio"}`}
                    />
                  ) : (
                    <div className="audio-placeholder">
                      {project.audio?.path ? project.audio.path : "Audio belum dimuat"}
                    </div>
                  )
                )}
                {track.kind === "captions" && project.words.map((word, index) => (
                  <button
                    type="button"
                    className="tl-word"
                    key={`${word.start}-${index}`}
                    style={{ left: word.start * pixelsPerSecond, width: Math.max(18, (word.end - word.start) * pixelsPerSecond - 3) }}
                    title={`${word.text} · ${formatTime(word.start)}–${formatTime(word.end)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      pause();
                      seek(word.start);
                    }}
                  >
                    {word.text}
                  </button>
                ))}
                {track.kind === "video" && project.scenes.map((clip) => renderClip(clip, false))}
                {track.kind === "overlay" && project.overlays.filter((clip) => clip.lane === track.lane).map((clip) => renderClip(clip, true))}
              </div>
            ))}
            <button
              type="button"
              className="tl-playhead"
              style={{ left: time * pixelsPerSecond }}
              onClick={() => { pause(); seek(time); }}
              aria-label={`Playhead at ${formatTime(time)}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
