import { create } from "zustand";

/** Single source of truth for the playhead. Nothing else keeps its own clock. */
interface PlaybackState {
  time: number;
  playing: boolean;
  duration: number;
  setDuration: (d: number) => void;
  seek: (t: number) => void;
  toggle: () => void;
  pause: () => void;
  /** advance by dt seconds (called by usePlaybackLoop) */
  tick: (dt: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  time: 0,
  playing: false,
  duration: 0,
  setDuration: (duration) => set({ duration }),
  seek: (t) => set({ time: Math.min(Math.max(0, t), get().duration) }),
  toggle: () => {
    const { playing, time, duration } = get();
    // restart from the top if play is pressed at the end
    set({ playing: !playing, time: !playing && time >= duration ? 0 : time });
  },
  pause: () => set({ playing: false }),
  tick: (dt) => {
    const { time, duration } = get();
    const next = time + dt;
    if (next >= duration) set({ time: duration, playing: false });
    else set({ time: next });
  },
}));
