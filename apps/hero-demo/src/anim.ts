import { Easing, interpolate, random } from 'remotion';

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);

/** Eased 0..1 progress of `frame` between two frames. */
export const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

/** Plain linear 0..1 progress (progress bars, marker sweeps). */
export const linear = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** A button press: 0, then 1 on `at`, then back to 0. */
export const press = (frame: number, at: number) =>
  interpolate(frame, [at - 2, at, at + 7], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Moves between keyframes of `[frame, value]` with an ease on each leg. */
export const track = (frame: number, keys: ReadonlyArray<readonly [number, number]>) =>
  interpolate(
    frame,
    keys.map(([f]) => f),
    keys.map(([, v]) => v),
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeInOut,
    },
  );

/**
 * Frame at which each character of `text` has been typed, starting at 0.
 * The pace varies per character (seeded, so every render is identical).
 */
export const typingSchedule = (text: string, seed: string, pace = 1) => {
  let t = 0;
  return Array.from(text, (char, index) => {
    const pause = char === ' ' ? 0.5 : 0;
    t += (0.55 + random(`${seed}-${index}`) * 0.9 + pause) * pace;
    return t;
  });
};

/** How many characters of a typing schedule are on screen `elapsed` frames in. */
export const typedCount = (schedule: number[], elapsed: number) =>
  schedule.filter((at) => at <= elapsed).length;

export type PathKey = readonly [frame: number, x: number, y: number];

const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Where the pointer is at `frame`, moving between keyframes with an ease. */
export const pointerAt = (frame: number, path: readonly PathKey[]) => {
  const frames = path.map(([f]) => f);
  const along = (index: 1 | 2) =>
    interpolate(
      frame,
      frames,
      path.map((key) => key[index]),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut },
    );
  return { x: along(1), y: along(2) };
};
