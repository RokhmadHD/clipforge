/**
 * Audio import (T5): waveform extraction for the timeline audio lane.
 *
 * computePeaks is a PURE function (no Web Audio API) so it is unit-testable in
 * node. extractAudio is browser-only (AudioContext.decodeAudioData) and must
 * never be imported from tests.
 */

/**
 * Split raw channel data into `buckets` equal buckets and return the peak
 * (max absolute amplitude) of each bucket, normalized to 0..1 by dividing by
 * the overall max. Silent input (overall max 0) divides by 1.0 and stays all
 * zeros; buckets without samples (buckets > channel.length) are 0.
 */
export function computePeaks(channel: Float32Array, buckets: number): number[] {
  if (buckets <= 0) return [];
  const peaks = new Array<number>(buckets).fill(0);
  const length = channel.length;
  if (length === 0) return peaks;
  for (let i = 0; i < length; i++) {
    const index = Math.min(buckets - 1, Math.floor((i * buckets) / length));
    const abs = Math.abs(channel[i]);
    if (abs > peaks[index]) peaks[index] = abs;
  }
  const max = peaks.reduce((m, v) => (v > m ? v : m), 0);
  const divisor = max > 0 ? max : 1;
  return peaks.map((v) => v / divisor);
}

/** Everything the timeline needs to draw the waveform. */
export interface AudioData {
  name: string;
  duration: number;
  peaks: number[];
}

/** Fixed resolution of the waveform cache (spec: 900 buckets). */
export const PEAK_BUCKETS = 900;

type AudioContextCtor = new () => AudioContext;

/**
 * Safari exposes only the prefixed constructor; typing it locally keeps the
 * DOM lib untouched (src/types/** must not be modified).
 */
type WindowWithWebkitAudio = Window & typeof globalThis & { webkitAudioContext?: AudioContextCtor };

/**
 * Decode an audio file and downmix all channels by AVERAGING them into one
 * Float32Array before computing PEAK_BUCKETS waveform peaks. (Averaging keeps
 * centered material like mono-in-stereo at the same amplitude; using only
 * channel 0 would ignore the other channels.)
 *
 * Browser-only: requires window.AudioContext / window.webkitAudioContext.
 * Throws an Error with an Indonesian, user-facing message on failure.
 */
export const extractAudio = async (file: File): Promise<AudioData> => {
  const scope = window as WindowWithWebkitAudio;
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio API tidak tersedia di browser ini.");
  const context = new Ctor();
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Callback form for Safari (webkitAudioContext has no promise overload).
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      context.decodeAudioData(arrayBuffer, resolve, (error: unknown) =>
        reject(error instanceof Error ? error : new Error("decodeAudioData gagal")),
      );
    });
    if (buffer.length === 0) throw new Error("File audio tidak berisi data yang bisa dibaca.");
    const channelCount = buffer.numberOfChannels;
    let mixed: Float32Array;
    if (channelCount === 1) {
      mixed = buffer.getChannelData(0);
    } else {
      mixed = new Float32Array(buffer.length);
      for (let c = 0; c < channelCount; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < mixed.length; i++) mixed[i] += data[i] / channelCount;
      }
    }
    return { name: file.name, duration: buffer.duration, peaks: computePeaks(mixed, PEAK_BUCKETS) };
  } catch (error) {
    const detail = error instanceof Error && error.message ? error.message : "format tidak didukung";
    throw new Error(`Gagal memuat audio "${file.name}": ${detail}.`);
  } finally {
    void context.close();
  }
};
