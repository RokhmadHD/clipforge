import { describe, expect, it } from "vitest";
import { computePeaks } from "./audio";

describe("computePeaks", () => {
  it("returns exactly `buckets` entries", () => {
    const channel = new Float32Array([0.1, -0.5, 0.3, 0.7, -0.2]);
    expect(computePeaks(channel, 5)).toHaveLength(5);
    expect(computePeaks(channel, 3)).toHaveLength(3);
    expect(computePeaks(channel, 64)).toHaveLength(64);
  });

  it("takes the max absolute amplitude per bucket", () => {
    // 4 samples into 4 buckets, max is 1.0 -> no rescaling
    const channel = new Float32Array([0.5, -0.25, -1, 0.75]);
    expect(computePeaks(channel, 4)).toEqual([0.5, 0.25, 1, 0.75]);
  });

  it("spreads samples evenly when bucket edges do not align with sample indices", () => {
    // 3 samples into 2 buckets: floor(i*2/3) -> 0,0,1; max 0.75 normalizes to 1
    // (float32-exact values so the normalization is deterministic)
    const channel = new Float32Array([0.5, -0.75, 0.25]);
    expect(computePeaks(channel, 2)).toEqual([1, 0.25 / 0.75]);
  });

  it("normalizes to 0..1 by the overall max", () => {
    const channel = new Float32Array([0.1, -0.5, 0.25, -0.125]);
    const peaks = computePeaks(channel, 4);
    expect(peaks[1]).toBe(1); // loudest bucket (|−0.5|) becomes exactly 1
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it("returns all zeros for silent input (overall max 0 divides by 1.0)", () => {
    expect(computePeaks(new Float32Array(8).fill(0), 4)).toEqual([0, 0, 0, 0]);
  });

  it("returns zeros for empty input without dividing by zero", () => {
    expect(computePeaks(new Float32Array([]), 3)).toEqual([0, 0, 0]);
  });

  it("handles more buckets than samples (empty buckets stay 0)", () => {
    // 2 samples into 4 buckets: floor(i*4/2) -> 0,2
    const channel = new Float32Array([1, -1]);
    expect(computePeaks(channel, 4)).toEqual([1, 0, 1, 0]);
  });

  it("returns an empty array for non-positive bucket counts", () => {
    expect(computePeaks(new Float32Array([0.5]), 0)).toEqual([]);
    expect(computePeaks(new Float32Array([0.5]), -2)).toEqual([]);
  });
});
