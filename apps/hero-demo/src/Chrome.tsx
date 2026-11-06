import { Check } from 'lucide-react';
import { useCurrentFrame } from 'remotion';
import { steps, timing } from './data';
import { color, HEIGHT, STEP_BAR, sans } from './theme';
import { TopBar } from './ui';

const crumbsByStep = [
  ['Dashboard', 'Import CV'],
  ['My CVs', 'Ana Castillo', 'Work'],
  ['Applications', 'Orbital Freight'],
];

/** Which scene is on screen, switching at the middle of each fade. */
export const useStep = () => {
  const frame = useCurrentFrame();
  const second = timing.importScene - timing.fade / 2;
  const third = second + timing.editScene - timing.fade;
  return frame < second ? 0 : frame < third ? 1 : 2;
};

const StepBar: React.FC<{ active: number }> = ({ active }) => (
  <div
    style={{
      position: 'absolute',
      inset: `${HEIGHT - STEP_BAR}px 0 0 0`,
      background: color.card,
      boxShadow: `0 -1px 0 ${color.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 26,
      fontFamily: sans,
      fontSize: 12.5,
    }}
  >
    {steps.map((label, index) => {
      const done = index < active;
      const current = index === active;
      return (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10.5,
              fontWeight: 600,
              background: current || done ? color.primary : color.card,
              color: current || done ? color.primaryFg : color.muted,
              boxShadow: current || done ? 'none' : `inset 0 0 0 1px ${color.input}`,
            }}
          >
            {done ? <Check size={11} strokeWidth={3} /> : index + 1}
          </div>
          <span
            style={{
              color: current ? color.ink : color.muted,
              fontWeight: current ? 600 : 400,
            }}
          >
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

/** Top bar and step bar, drawn over the scenes. */
export const Chrome: React.FC = () => {
  const step = useStep();
  return (
    <>
      <TopBar crumbs={crumbsByStep[step]} />
      <StepBar active={step} />
    </>
  );
};
