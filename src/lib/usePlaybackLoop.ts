import { useEffect } from "react";
import { usePlaybackStore } from "../stores/playbackStore";

/** Drives playbackStore.tick() with requestAnimationFrame while playing.
 *  (Preview only -- the renderer never uses a clock, it seeks frame by frame.) */
export function usePlaybackLoop(): void {
  const playing = usePlaybackStore((s) => s.playing);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      usePlaybackStore.getState().tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
