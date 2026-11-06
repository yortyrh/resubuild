import { Download, Sparkles } from 'lucide-react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { linear, press, progress, typedCount, typingSchedule } from '../anim';
import { cv, job } from '../data';
import { color, sans } from '../theme';
import { Button, Card, Caret, Chip, Cursor, Field, Mark, Muted, Paper, Title } from '../ui';

/** Frame (of this scene) at which the form gives way to the tailored CV. */
const SWAP = 84;
const CLICK_PREPARE = 62;
const CLICK_PDF = 144;

const companySchedule = typingSchedule(job.company, 'company');
const positionSchedule = typingSchedule(job.position, 'position', 0.8);

export const TailorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const formOpacity = 1 - progress(frame, SWAP - 4, SWAP + 4);
  const resultOpacity = progress(frame, SWAP, SWAP + 10);
  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      {formOpacity > 0 ? (
        <div style={{ opacity: formOpacity }}>
          <PrepareForm frame={frame} />
        </div>
      ) : null}
      {frame >= SWAP ? (
        <div style={{ opacity: resultOpacity }}>
          <TailoredCv frame={frame - SWAP} />
        </div>
      ) : null}
      <Cursor
        path={[
          [0, 470, 150],
          [10, 300, 210],
          [52, 300, 210],
          [CLICK_PREPARE - 2, 150, 432],
          [CLICK_PREPARE + 12, 340, 452],
          [SWAP + 22, 400, 330],
          [CLICK_PDF - 14, 400, 330],
          [CLICK_PDF - 2, 548, 86],
        ]}
        clicks={[CLICK_PREPARE, CLICK_PDF]}
      />
    </AbsoluteFill>
  );
};

const PrepareForm: React.FC<{ frame: number }> = ({ frame }) => {
  const intro = progress(frame, 0, 14);
  const lines = job.posting.filter((_, index) => frame >= 10 + index * 4);
  const company = job.company.slice(0, typedCount(companySchedule, frame - 22));
  const position = job.position.slice(0, typedCount(positionSchedule, frame - 34));
  const typingCompany = company.length < job.company.length && frame >= 22;
  const typingPosition = position.length < job.position.length && frame >= 34;
  const working = frame >= CLICK_PREPARE;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 58,
          opacity: intro,
          translate: `0 ${(1 - intro) * 8}px`,
        }}
      >
        <Title size={30}>Prepare application</Title>
        <Muted style={{ marginTop: 6 }}>
          Paste the job posting. Resubuild tailors a copy of your CV for it.
        </Muted>
      </div>
      <Card
        style={{
          position: 'absolute',
          left: 28,
          top: 130,
          width: 544,
          height: 350,
          padding: 18,
          opacity: intro,
        }}
      >
        <Field
          label="Job posting"
          focused={frame >= 8 && frame < 22}
          value={
            <div style={{ height: 78, overflow: 'hidden', color: color.ink }}>
              {lines.map((line, index) => (
                <div
                  key={line}
                  style={{
                    fontWeight: index === 0 ? 600 : 400,
                    color: index === 0 ? color.ink : color.muted,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          }
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <Field
            label="Company"
            style={{ flex: 1 }}
            focused={typingCompany}
            value={
              <>
                {company}
                {typingCompany ? <Caret steady /> : <>&nbsp;</>}
              </>
            }
          />
          <Field
            label="Position"
            style={{ flex: 1 }}
            focused={typingPosition}
            value={
              <>
                {position}
                {typingPosition ? <Caret steady /> : <>&nbsp;</>}
              </>
            }
          />
        </div>
        <Field label="Base CV" value={job.baseCv} style={{ marginTop: 14 }} />
        <div style={{ position: 'absolute', left: 18, top: 284 }}>
          <Button
            icon={<Sparkles size={14} />}
            label={working ? 'Tailoring…' : 'Prepare application'}
            tone={working ? 'muted' : 'primary'}
            pressed={press(frame, CLICK_PREPARE)}
            style={{ width: 160 }}
          />
        </div>
        {working ? (
          <div style={{ position: 'absolute', left: 200, top: 296, width: 326 }}>
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
                  width: `${linear(frame, CLICK_PREPARE + 2, SWAP - 2) * 100}%`,
                  height: '100%',
                  background: color.primary,
                }}
              />
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
};

const changes = [
  'Summary now leads with pricing systems',
  'Pricing engine named in your top bullet',
  'Low-latency APIs added to skills',
];

const TailoredCv: React.FC<{ frame: number }> = ({ frame }) => {
  const sweep = (index: number) => linear(frame, 8 + index * 14, 20 + index * 14);
  const done = frame >= CLICK_PDF - 84 + 2;
  const toast = progress(frame, CLICK_PDF - 84 + 2, CLICK_PDF - 84 + 12);
  return (
    <>
      <div style={{ position: 'absolute', left: 28, top: 54 }}>
        <Title size={26}>{job.company}</Title>
        <Muted style={{ marginTop: 4 }}>{job.position}</Muted>
      </div>
      <div style={{ position: 'absolute', right: 28, top: 61 }}>
        <Button
          icon={<Download size={14} />}
          label="PDF"
          pressed={press(frame + 84, CLICK_PDF)}
          style={{ width: 84 }}
        />
      </div>

      <Card
        style={{
          position: 'absolute',
          left: 28,
          top: 112,
          width: 544,
          height: 392,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: 3,
              borderRadius: 7,
              background: color.secondary,
              fontSize: 12.5,
            }}
          >
            {['Job posting', 'Tailored CV', 'Cover letter'].map((tab) => (
              <div
                key={tab}
                style={{
                  padding: '4px 11px',
                  borderRadius: 5,
                  fontWeight: tab === 'Tailored CV' ? 600 : 400,
                  color: tab === 'Tailored CV' ? color.ink : color.muted,
                  background: tab === 'Tailored CV' ? color.card : 'transparent',
                }}
              >
                {tab}
              </div>
            ))}
          </div>
          <Chip tone="accent">
            <Sparkles size={11} /> 3 changes
          </Chip>
        </div>

        <Paper
          style={{
            position: 'absolute',
            left: 14,
            top: 56,
            width: 326,
            height: 322,
            padding: '14px 16px',
            fontSize: 9.5,
            lineHeight: 1.45,
          }}
        >
          <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700 }}>{cv.name}</div>
          <div style={{ textAlign: 'center' }}>{cv.headline}</div>
          <Rule>Summary</Rule>
          <div style={{ marginTop: 3 }}>
            Product engineer with eight years building checkout and{' '}
            <Mark sweep={sweep(0)}>pricing systems for freight platforms</Mark>.
          </div>
          <Rule>Experience</Rule>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span>
              <b>{cv.company}</b>, {cv.place}
            </span>
            <span style={{ fontSize: 8.5, color: 'hsl(153 6% 37%)' }}>{cv.dates}</span>
          </div>
          <div style={{ fontStyle: 'italic' }}>{cv.role}</div>
          <ul style={{ margin: '3px 0 0', paddingLeft: 14 }}>
            <li>
              Cut checkout latency by 40% by moving the <Mark sweep={sweep(1)}>pricing engine</Mark>{' '}
              to the edge
            </li>
            {cv.highlights.map((line) => (
              <li key={line} style={{ marginTop: 1.5 }}>
                {line}
              </li>
            ))}
          </ul>
          <Rule>Skills</Rule>
          <div style={{ marginTop: 3 }}>
            TypeScript, Postgres, React, <Mark sweep={sweep(2)}>Low-latency APIs</Mark>
          </div>
          <Rule>Education</Rule>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <b>{cv.school}</b>
            <span style={{ fontSize: 8.5, color: 'hsl(153 6% 37%)' }}>{cv.schoolDates}</span>
          </div>
        </Paper>

        <div
          style={{
            position: 'absolute',
            left: 356,
            top: 62,
            width: 174,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, color: color.ink }}>What changed</div>
          {changes.map((line, index) => {
            const shown = progress(frame, 8 + index * 14, 18 + index * 14);
            return (
              <div
                key={line}
                style={{
                  display: 'flex',
                  gap: 9,
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: color.muted,
                  opacity: shown,
                  translate: `0 ${(1 - shown) * 6}px`,
                }}
              >
                <span
                  style={{
                    flex: 'none',
                    width: 10,
                    height: 10,
                    marginTop: 3,
                    borderRadius: 2,
                    background: color.marker,
                  }}
                />
                {line}
              </div>
            );
          })}
        </div>
      </Card>

      {done ? (
        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            top: 478,
            height: 38,
            borderRadius: 8,
            background: color.ink,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '0 14px',
            fontSize: 12.5,
            fontWeight: 500,
            opacity: toast,
            translate: `0 ${(1 - toast) * 10}px`,
            boxShadow: '0 8px 20px hsl(153 18% 9% / 0.25)',
          }}
        >
          <Download size={14} /> {job.pdf}
          <span style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 400 }}>No watermark</span>
        </div>
      ) : null}
    </>
  );
};

const Rule: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      marginTop: 9,
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
