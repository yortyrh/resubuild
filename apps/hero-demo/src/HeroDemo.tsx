import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Chrome } from './Chrome';
import { timing, totalFrames } from './data';
import { EditScene } from './scenes/EditScene';
import { ImportScene } from './scenes/ImportScene';
import { TailorScene } from './scenes/TailorScene';
import { color, sans } from './theme';

/** Fades the whole stage in and out so the GIF loops without a hard cut. */
const LoopFade: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, totalFrames - 10, totalFrames - 1], [1, 0, 0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{ background: color.desk, opacity }} />;
};

export const HeroDemo: React.FC = () => {
  const transition = (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: timing.fade })}
    />
  );
  return (
    <AbsoluteFill style={{ background: color.desk, fontFamily: sans }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={timing.importScene}>
          <ImportScene />
        </TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={timing.editScene}>
          <EditScene />
        </TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={timing.tailorScene}>
          <TailorScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Chrome />
      <LoopFade />
    </AbsoluteFill>
  );
};
