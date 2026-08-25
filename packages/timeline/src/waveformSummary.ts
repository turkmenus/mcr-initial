/**
 * True PCM Audio Waveform Analysis & Peak/RMS Sampler
 * Inspired by OpenCut (opencut-app/opencut-classic: src/media/waveform-summary.ts)
 */

export interface SourceWaveformSummary {
  sampleRate: number;
  durationSec: number;
  channels: number;
  peaks: Float32Array; // Normalized Peak amplitudes [0..1]
  rms: Float32Array;   // Normalized RMS energy [0..1]
  bucketCount: number;
}

/**
 * Builds bucketed peak and RMS values from decoded PCM audio channel data.
 * @param channelData Float32Array of raw PCM audio samples (-1.0 to +1.0)
 * @param sampleRate Audio sample rate (e.g. 44100 or 48000 Hz)
 * @param targetBuckets Total number of buckets to downsample into (default 800)
 */
export function buildWaveformSampleBuckets(
  channelData: Float32Array,
  sampleRate: number,
  targetBuckets = 800
): SourceWaveformSummary {
  const totalSamples = channelData.length;
  const durationSec = totalSamples / (sampleRate || 48000);
  const bucketCount = Math.max(10, Math.min(targetBuckets, totalSamples));
  const samplesPerBucket = totalSamples / bucketCount;

  const peaks = new Float32Array(bucketCount);
  const rms = new Float32Array(bucketCount);

  for (let b = 0; b < bucketCount; b++) {
    const startSample = Math.floor(b * samplesPerBucket);
    const endSample = Math.min(totalSamples, Math.floor((b + 1) * samplesPerBucket));

    let maxVal = 0;
    let sumSquares = 0;
    let count = 0;

    for (let s = startSample; s < endSample; s++) {
      const val = Math.abs(channelData[s] || 0);
      if (val > maxVal) maxVal = val;
      sumSquares += val * val;
      count++;
    }

    peaks[b] = Math.min(1.0, maxVal);
    rms[b] = count > 0 ? Math.min(1.0, Math.sqrt(sumSquares / count) * 1.8) : 0;
  }

  return {
    sampleRate,
    durationSec,
    channels: 1,
    peaks,
    rms,
    bucketCount,
  };
}

/**
 * Samples peak amplitude for a specific clip interval and width in pixels.
 */
export function sampleWaveformRange(
  summary: SourceWaveformSummary,
  startSec: number,
  durationSec: number,
  pixelWidth: number
): { peaks: number[]; rms: number[] } {
  if (!summary || summary.peaks.length === 0) {
    return { peaks: [], rms: [] };
  }

  const outPeaks: number[] = [];
  const outRms: number[] = [];

  const safeTotalDuration = Math.max(0.1, summary.durationSec);
  const startProgress = Math.max(0, Math.min(1, startSec / safeTotalDuration));
  const endProgress = Math.max(0, Math.min(1, (startSec + durationSec) / safeTotalDuration));
  const progressSpan = Math.max(0.0001, endProgress - startProgress);

  const numPixels = Math.max(1, Math.floor(pixelWidth));
  const totalBuckets = summary.bucketCount;

  for (let px = 0; px < numPixels; px++) {
    const pixelProgress = startProgress + (px / numPixels) * progressSpan;
    const bucketIndex = Math.max(
      0,
      Math.min(totalBuckets - 1, Math.floor(pixelProgress * (totalBuckets - 1)))
    );

    outPeaks.push(summary.peaks[bucketIndex] || 0);
    outRms.push(summary.rms[bucketIndex] || 0);
  }

  return { peaks: outPeaks, rms: outRms };
}
