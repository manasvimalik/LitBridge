/**
 * Minimal MPEG audio frame parser, so MP3 chunks can be stitched and timed
 * without ffmpeg. Handles MPEG-1/2/2.5 Layer III, skips ID3v2 tags, and drops
 * Xing/Info/VBRI header frames (they describe a single file and would report
 * the wrong length once chunks are concatenated).
 */

const BITRATES: Record<string, number[]> = {
  // kbps by bitrate index, for Layer III
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

export interface Mp3Info {
  frames: Uint8Array[];
  sampleRate: number;
  duration: number;
}

function skipId3(buf: Uint8Array): number {
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    return 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  return 0;
}

function isInfoFrame(frame: Uint8Array): boolean {
  const s = new TextDecoder('latin1').decode(frame.subarray(0, Math.min(frame.length, 64)));
  return s.includes('Xing') || s.includes('Info') || s.includes('VBRI');
}

export function parseMp3(buf: Uint8Array): Mp3Info {
  const frames: Uint8Array[] = [];
  let sampleRate = 44100;
  let samples = 0;
  let i = skipId3(buf);
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const version = (buf[i + 1] >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 0x03; // 1 = Layer III
    const bitrateIdx = buf[i + 2] >> 4;
    const srIdx = (buf[i + 2] >> 2) & 0x03;
    const padding = (buf[i + 2] >> 1) & 0x01;
    if (version === 1 || layer !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const bitrate = BITRATES[version === 3 ? 'v1' : 'v2'][bitrateIdx] * 1000;
    sampleRate = SAMPLE_RATES[version][srIdx];
    const samplesPerFrame = version === 3 ? 1152 : 576;
    const length = Math.floor(((samplesPerFrame / 8) * bitrate) / sampleRate) + padding;
    if (length < 4 || i + length > buf.length) break;
    const frame = buf.subarray(i, i + length);
    if (!(frames.length === 0 && isInfoFrame(frame))) {
      frames.push(frame);
      samples += samplesPerFrame;
    }
    i += length;
  }
  return { frames, sampleRate, duration: samples / sampleRate };
}

export function concatFrames(parts: Uint8Array[][]): Uint8Array {
  const all = parts.flat();
  const out = new Uint8Array(all.reduce((n, f) => n + f.length, 0));
  let o = 0;
  for (const f of all) {
    out.set(f, o);
    o += f.length;
  }
  return out;
}
