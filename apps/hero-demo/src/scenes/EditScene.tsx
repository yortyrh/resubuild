import { Check, Plus } from 'lucide-react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { press, progress, typedCount, typingSchedule } from '../anim';
import { cv } from '../data';
import { color, sans } from '../theme';
import { Button, Card, Caret, Cursor, Field, Paper } from '../ui';

const CARD = { left: 20, top: 54, width: 298, height: 456 };
const PAPER = { left: 330, top: 54, width: 250, height: 456 };

const CLICK_ADD = 22;
const TYPE_FROM = 32;
const CLICK_SAVE = 120;

const schedule = typingSchedule(cv.typed, 'edit-bullet');

const Bullet: React.FC<{ children: React.ReactNode; focused?: boolean }> = ({
  children,
  focused,
}) => <Field value={children} focused={focused} inputStyle={{ minHeight: 34 }} />;

export const EditScene: React.FC = () => {
  const frame = useCurrentFrame();
  const intro = progress(frame, 0, 14);
  const adding = frame >= CLICK_ADD + 2;
  const count = adding ? typedCount(schedule, frame - TYPE_FROM) : 0;
  const text = cv.typed.slice(0, count);
  const typing = adding && count < cv.typed.length;
  const saved = frame >= CLICK_SAVE + 2;
  const arrive = progress(frame, TYPE_FROM, TYPE_FROM + 10);

  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      {/* The entry form. */}
      <Card
        active={!saved}
        style={{
          position: 'absolute',
          ...CARD,
          opacity: intro,
          translate: `0 ${(1 - intro) * 10}px`,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: color.ink }}>Edit work entry</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Field label="Company" value={cv.company} style={{ flex: 1.25 }} />
          <Field label="Dates" value="2021 – Present" style={{ flex: 1 }} />
        </div>
        <Field label="Position" value={cv.role} style={{ marginTop: 12 }} />

        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: color.ink,
            marginTop: 14,
            marginBottom: 5,
          }}
        >
          Highlights
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cv.highlights.map((line) => (
            <Bullet key={line}>{line}</Bullet>
          ))}
          {adding ? (
            <Bullet focused={!saved}>
              {text}
              {typing || (!saved && count === 0) ? <Caret steady={typing} /> : null}
              {count === 0 && !typing ? <span style={{ color: color.muted }}>&nbsp;</span> : null}
            </Bullet>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 9,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            fontWeight: 500,
            color: color.primary,
          }}
        >
          <Plus size={14} /> Add highlight
        </div>

        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 14,
            display: 'flex',
            gap: 8,
            paddingTop: 12,
            boxShadow: 'inset 0 1px 0 hsl(146 9% 83% / 0.6)',
          }}
        >
          <Button label="Save" pressed={press(frame, CLICK_SAVE)} style={{ width: 66 }} />
          <Button label="Cancel" tone="outline" style={{ width: 70 }} />
        </div>
      </Card>

      {/* The page, set the way it prints. */}
      <Paper
        style={{
          position: 'absolute',
          ...PAPER,
          padding: '18px 16px',
          fontSize: 10,
          lineHeight: 1.45,
          opacity: intro,
          translate: `0 ${(1 - intro) * 10}px`,
        }}
      >
        <div
          style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}
        >
          {cv.name}
        </div>
        <div style={{ textAlign: 'center' }}>{cv.headline}</div>
        <SectionRule>Experience</SectionRule>
        <Row left={<b>{cv.company}</b>} right="2021 – Present" extra={`, ${cv.place}`} />
        <div style={{ fontStyle: 'italic' }}>{cv.role}</div>
        <ul style={{ margin: '3px 0 0', paddingLeft: 14 }}>
          {cv.highlights.map((line) => (
            <li key={line} style={{ marginTop: 1.5 }}>
              {line}
            </li>
          ))}
          {text ? (
            <li
              style={{
                marginTop: 1.5,
                borderRadius: 2,
                background: `hsl(160 56% 27% / ${0.14 * (1 - arrive)})`,
              }}
            >
              {text}
            </li>
          ) : null}
        </ul>
        <Row
          left={<b>{cv.earlier.company}</b>}
          right={cv.earlier.dates}
          extra={`, ${cv.earlier.place}`}
        />
        <div style={{ fontStyle: 'italic' }}>{cv.earlier.role}</div>
        <ul style={{ margin: '3px 0 0', paddingLeft: 14 }}>
          {cv.earlier.highlights.map((line) => (
            <li key={line} style={{ marginTop: 1.5 }}>
              {line}
            </li>
          ))}
        </ul>
        <SectionRule>Education</SectionRule>
        <Row left={<b>{cv.school}</b>} right={cv.schoolDates} />
        <div>BSc, Informatics Engineering</div>
      </Paper>

      {/* Confirmation after saving. */}
      {saved ? (
        <div
          style={{
            position: 'absolute',
            right: 22,
            top: 50,
            height: 32,
            padding: '0 12px',
            borderRadius: 6,
            background: color.card,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12.5,
            fontWeight: 500,
            color: color.ink,
            boxShadow: `0 0 0 1px ${color.border}, 0 6px 16px hsl(153 18% 9% / 0.14)`,
            opacity: progress(frame, CLICK_SAVE + 2, CLICK_SAVE + 10),
            translate: `0 ${(1 - progress(frame, CLICK_SAVE + 2, CLICK_SAVE + 10)) * -8}px`,
          }}
        >
          <Check size={14} color={color.success} strokeWidth={2.75} /> Saved
        </div>
      ) : null}

      <Cursor
        path={[
          [0, 300, 330],
          [CLICK_ADD, 92, 376],
          [CLICK_ADD + 18, 92, 376],
          [CLICK_ADD + 34, 250, 452],
          [104, 250, 452],
          [CLICK_SAVE - 2, 58, 482],
        ]}
        clicks={[CLICK_ADD, CLICK_SAVE]}
      />
    </AbsoluteFill>
  );
};

const SectionRule: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      marginTop: 10,
      paddingBottom: 1.5,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      boxShadow: `inset 0 -1px 0 ${color.pageRule}`,
    }}
  >
    {children}
  </div>
);

const Row: React.FC<{
  left: React.ReactNode;
  right: string;
  extra?: string;
}> = ({ left, right, extra }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 4,
    }}
  >
    <span>
      {left}
      {extra}
    </span>
    <span style={{ color: 'hsl(153 6% 37%)', fontSize: 8.5 }}>{right}</span>
  </div>
);
