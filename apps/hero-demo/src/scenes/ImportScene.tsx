import { Briefcase, Check, FileText, GraduationCap, Upload, User, Wrench, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { linear, type PathKey, pointerAt, press, progress } from '../anim';
import { cv } from '../data';
import { color, mono, sans } from '../theme';
import { Button, Card, Chip, Cursor, Muted, Title } from '../ui';

const LEFT = 28;
const WIDTH = 544;

/** Frame at which the file lands in the drop zone, and where the run starts. */
const DROPPED = 40;
const CLICK_IMPORT = 70;
const READY = 112;
const CLICK_SAVE = 140;

/** The pointer carries the file to the drop zone, then presses the buttons. */
const PATH: PathKey[] = [
  [0, 548, 372],
  [12, 520, 330],
  [DROPPED, 300, 188],
  [DROPPED + 12, 300, 188],
  [62, 140, 272],
  [READY + 6, 140, 272],
];

const statuses = [
  { from: 72, text: 'Reading the PDF…' },
  { from: 88, text: 'Drafting résumé…' },
  { from: 101, text: 'Checking against JSON Resume…' },
];

const result: { icon: ReactNode; label: string; value: string }[] = [
  { icon: <User size={14} />, label: 'Basics', value: `${cv.name} · ${cv.headline}` },
  { icon: <Briefcase size={14} />, label: 'Work', value: '3 entries' },
  { icon: <GraduationCap size={14} />, label: 'Education', value: `1 entry · ${cv.school}` },
  { icon: <Wrench size={14} />, label: 'Skills', value: '14 skills in 4 groups' },
];

const FileRow: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div
      style={{
        width: 34,
        height: 40,
        borderRadius: 4,
        background: color.secondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FileText size={18} color={color.muted} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: color.ink }}>{cv.file}</div>
      <Muted size={12}>212 KB</Muted>
    </div>
    <Chip>PDF résumé</Chip>
    <X size={14} color={color.muted} />
  </div>
);

export const ImportScene: React.FC = () => {
  const frame = useCurrentFrame();

  const intro = progress(frame, 0, 14);
  const hovering = linear(frame, 28, 38) * (frame < DROPPED ? 1 : 0);
  const filed = progress(frame, DROPPED, DROPPED + 6);
  const running = frame >= CLICK_IMPORT && frame < READY;
  const done = frame >= READY;
  const status = [...statuses].reverse().find((s) => frame >= s.from);
  const bar = interpolate(frame, [72, 108], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const label = done ? 'Save CV' : running ? 'Importing…' : 'Import my CV';
  const tone = running ? 'muted' : 'primary';
  const enabled = frame >= DROPPED + 8;

  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: 58,
          opacity: intro,
          translate: `0 ${(1 - intro) * 8}px`,
        }}
      >
        <Title size={30}>Import your CV</Title>
        <Muted style={{ marginTop: 6 }}>
          Drop a PDF, Word file or image. The AI reads it into JSON Resume fields.
        </Muted>
      </div>

      {/* Drop zone, then the chosen file. */}
      <Card
        style={{
          position: 'absolute',
          left: LEFT,
          top: 130,
          width: WIDTH,
          height: 104,
          boxSizing: 'border-box',
          opacity: intro,
          background: hovering > 0 ? color.accent : color.card,
          boxShadow: hovering > 0 ? `0 0 0 1.5px ${color.primary}` : `0 0 0 1px ${color.border}`,
          border: filed < 1 && hovering === 0 ? `1.5px dashed ${color.input}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: 1 - filed,
          }}
        >
          <Upload size={20} color={hovering > 0 ? color.primary : color.muted} />
          <div style={{ fontSize: 13.5, fontWeight: 500, color: color.ink }}>Drop your CV here</div>
          <Muted size={12}>PDF, Word, Markdown or image</Muted>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: '0 20px',
            opacity: filed,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '100%' }}>
            <FileRow />
          </div>
        </div>
      </Card>

      {/* The file being dragged in. */}
      {frame < DROPPED + 2 ? <FloatingFile frame={frame} /> : null}

      <div style={{ position: 'absolute', left: LEFT, top: 250, opacity: intro }}>
        <Button
          label={label}
          tone={tone}
          dim={!enabled}
          pressed={Math.max(press(frame, CLICK_IMPORT), press(frame, CLICK_SAVE))}
          style={{ width: 118 }}
        />
      </div>

      {/* Progress while the AI reads the file. */}
      {running ? (
        <div style={{ position: 'absolute', left: LEFT, top: 304, width: WIDTH }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: color.secondary,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${bar * 100}%`,
                height: '100%',
                background: color.primary,
                borderRadius: 3,
              }}
            />
          </div>
          <Muted size={12} style={{ marginTop: 8 }}>
            {status?.text}
          </Muted>
        </div>
      ) : null}

      {/* The structured result. */}
      {done ? (
        <Card
          style={{
            position: 'absolute',
            left: LEFT,
            top: 298,
            width: WIDTH,
            padding: '14px 18px 6px',
            opacity: progress(frame, READY, READY + 8),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>
              Review before saving
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, color: color.muted }}>JSON Resume</span>
          </div>
          {result.map((row, index) => {
            const at = READY + 4 + index * 6;
            const shown = progress(frame, at, at + 8);
            return (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 34,
                  opacity: shown,
                  translate: `0 ${(1 - shown) * 6}px`,
                  boxShadow: index > 0 ? `inset 0 1px 0 hsl(146 9% 83% / 0.6)` : 'none',
                }}
              >
                <span style={{ color: color.muted, display: 'flex' }}>{row.icon}</span>
                <span style={{ width: 78, fontSize: 13, fontWeight: 600, color: color.ink }}>
                  {row.label}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: color.muted }}>{row.value}</span>
                <Check size={15} color={color.success} strokeWidth={2.5} />
              </div>
            );
          })}
        </Card>
      ) : null}

      <Cursor path={PATH} clicks={[CLICK_IMPORT, CLICK_SAVE]} />
    </AbsoluteFill>
  );
};

/** The file chip that travels with the pointer until it is dropped. */
const FloatingFile: React.FC<{ frame: number }> = ({ frame }) => {
  const { x, y } = pointerAt(frame, PATH);
  const fade = 1 - progress(frame, DROPPED - 2, DROPPED + 2);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 16,
        top: y - 8,
        width: 232,
        height: 44,
        padding: '0 10px',
        borderRadius: 6,
        background: color.card,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: `0 0 0 1px ${color.border}, 0 8px 20px hsl(153 18% 9% / 0.16)`,
        rotate: `${interpolate(frame, [0, DROPPED], [-3, 0], { extrapolateRight: 'clamp' })}deg`,
        opacity: progress(frame, 0, 8) * fade,
      }}
    >
      <FileText size={16} color={color.muted} />
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: color.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cv.file}
      </div>
    </div>
  );
};
