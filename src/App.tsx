import { useEffect, useRef, type CSSProperties } from "react";
import { usePlaybackLoop } from "./lib/usePlaybackLoop";
import { useHotkeys } from "./lib/useHotkeys";
import { usePlaybackStore } from "./stores/playbackStore";
import { useProjectStore } from "./stores/projectStore";
import { useTemplateStore } from "./stores/templateStore";
import { LAYOUT_DEFAULTS, useUiStore } from "./stores/uiStore";
import { TopBar } from "./components/layout/TopBar";
import { MaterialLibrary } from "./components/layout/MaterialLibrary";
import { ModePlaceholder } from "./components/layout/ModePlaceholder";
import { Resizer } from "./components/layout/Resizer";
import { PreviewStage } from "./components/preview/PreviewStage";
import { Inspector } from "./components/inspector/Inspector";
import { Timeline } from "./components/timeline/Timeline";

export function App() {
  usePlaybackLoop();
  useHotkeys({
    undo: useProjectStore((s) => s.undo),
    redo: useProjectStore((s) => s.redo),
  });

  const mode = useUiStore((s) => s.mode);
  const libraryWidth = useUiStore((s) => s.libraryWidth);
  const inspectorWidth = useUiStore((s) => s.inspectorWidth);
  const timelineHeight = useUiStore((s) => s.timelineHeight);
  const setLibraryWidth = useUiStore((s) => s.setLibraryWidth);
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth);
  const setTimelineHeight = useUiStore((s) => s.setTimelineHeight);
  const loadTemplates = useTemplateStore((s) => s.load);
  const audioDuration = useProjectStore((s) => s.project.audio?.duration ?? 0);
  const setDuration = usePlaybackStore((s) => s.setDuration);
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setDuration(audioDuration);
  }, [audioDuration, setDuration]);

  const libraryRight = () => appRef.current?.getBoundingClientRect().left ?? 0;
  const appRight = () => appRef.current?.getBoundingClientRect().right ?? window.innerWidth;
  const appBottom = () => appRef.current?.getBoundingClientRect().bottom ?? window.innerHeight;

  const style = {
    "--lib-w": `${libraryWidth}px`,
    "--insp-w": `${inspectorWidth}px`,
    "--tl-h": `${timelineHeight}px`,
  } as CSSProperties;

  return (
    <div className="app" ref={appRef} style={style}>
      <TopBar />
      {mode === "editor" ? (
        <>
          <MaterialLibrary />
          <PreviewStage />
          <Inspector />
          <Timeline />
          <Resizer
            className="resizer-lib"
            ariaLabel="Lebar panel Material Library"
            orientation="vertical"
            onResize={(clientX) => setLibraryWidth(clientX - libraryRight())}
            onReset={() => setLibraryWidth(LAYOUT_DEFAULTS.libraryWidth)}
          />
          <Resizer
            className="resizer-insp"
            ariaLabel="Lebar panel Inspector"
            orientation="vertical"
            onResize={(clientX) => setInspectorWidth(appRight() - clientX)}
            onReset={() => setInspectorWidth(LAYOUT_DEFAULTS.inspectorWidth)}
          />
          <Resizer
            className="resizer-tl"
            ariaLabel="Tinggi timeline"
            orientation="horizontal"
            onResize={(_clientX, clientY) => setTimelineHeight(appBottom() - clientY)}
            onReset={() => setTimelineHeight(LAYOUT_DEFAULTS.timelineHeight)}
          />
        </>
      ) : (
        <ModePlaceholder mode={mode} />
      )}
    </div>
  );
}
