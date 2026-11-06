import { Composition } from 'remotion';
import { totalFrames } from './data';
import { HeroDemo } from './HeroDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroDemo"
      component={HeroDemo}
      durationInFrames={totalFrames}
      fps={30}
      width={600}
      height={580}
    />
  );
};
