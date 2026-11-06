import { ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import { type PathKey, pointerAt, progress } from './anim';
import { color, display, resume, sans } from './theme';

/** `surface-soft`: a white panel with a 1px hairline ring. */
export const Card: React.FC<{
  children?: ReactNode;
  style?: CSSProperties;
  /** The ring used while a form is being edited (`ring-primary/50`). */
  active?: boolean;
}> = ({ children, style, active }) => (
  <div
    style={{
      background: color.card,
      borderRadius: 8,
      boxShadow: active ? `0 0 0 1.5px ${color.primaryRing}` : `0 0 0 1px ${color.border}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Page and section titles (`.display`). */
export const Title: React.FC<{ children: ReactNode; size?: number; style?: CSSProperties }> = ({
  children,
  size = 28,
  style,
}) => (
  <div
    style={{
      fontFamily: display,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.1,
      letterSpacing: '-0.01em',
      color: color.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Muted: React.FC<{ children: ReactNode; size?: number; style?: CSSProperties }> = ({
  children,
  size = 13,
  style,
}) => (
  <div style={{ fontSize: size, lineHeight: 1.4, color: color.muted, ...style }}>{children}</div>
);

type ButtonTone = 'primary' | 'outline' | 'muted';

export const Button: React.FC<{
  label: string;
  icon?: ReactNode;
  tone?: ButtonTone;
  /** Rendered at half strength, like a disabled control. */
  dim?: boolean;
  /** 0..1 press feedback. */
  pressed?: number;
  style?: CSSProperties;
}> = ({ label, icon, tone = 'primary', dim, pressed = 0, style }) => {
  const tones: Record<ButtonTone, CSSProperties> = {
    primary: { background: color.primary, color: color.primaryFg },
    outline: {
      background: color.card,
      color: color.ink,
      boxShadow: `inset 0 0 0 1px ${color.input}`,
    },
    muted: { background: color.secondary, color: color.muted },
  };
  return (
    <div
      style={{
        height: 34,
        padding: '0 14px',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        opacity: dim ? 0.5 : 1,
        scale: String(1 - 0.04 * pressed),
        ...tones[tone],
        ...style,
      }}
    >
      {icon}
      {label}
    </div>
  );
};

/** A labelled single-line field. */
export const Field: React.FC<{
  label?: string;
  value: ReactNode;
  focused?: boolean;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
}> = ({ label, value, focused, style, inputStyle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
    {label ? <div style={{ fontSize: 12, fontWeight: 500, color: color.ink }}>{label}</div> : null}
    <div
      style={{
        minHeight: 32,
        padding: '6px 10px',
        borderRadius: 6,
        background: color.card,
        fontSize: 13,
        lineHeight: 1.35,
        color: color.ink,
        boxShadow: focused
          ? `0 0 0 1px ${color.primary}, 0 0 0 4px hsl(160 56% 27% / 0.14)`
          : `0 0 0 1px ${color.input}`,
        ...inputStyle,
      }}
    >
      {value}
    </div>
  </div>
);

/** The text caret of a focused field; it blinks about twice a second. */
export const Caret: React.FC<{ steady?: boolean }> = ({ steady }) => {
  const frame = useCurrentFrame();
  const on = steady || Math.floor(frame / 15) % 2 === 0;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 1.5,
        height: '1.05em',
        marginLeft: 1,
        verticalAlign: '-0.15em',
        background: color.primary,
        opacity: on ? 1 : 0,
      }}
    />
  );
};

export const Chip: React.FC<{
  children: ReactNode;
  tone?: 'plain' | 'accent';
  style?: CSSProperties;
}> = ({ children, tone = 'plain', style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 8px',
      borderRadius: 6,
      fontSize: 11.5,
      fontWeight: 500,
      background: tone === 'accent' ? color.accent : color.secondary,
      color: tone === 'accent' ? color.accentFg : color.muted,
      ...style,
    }}
  >
    {children}
  </span>
);

/** `.marker-text`: yellow marker for text the AI tailoring changed. */
export const Mark: React.FC<{ children: ReactNode; sweep: number }> = ({ children, sweep }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(transparent 55%, ${color.marker} 55%)`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${sweep * 100}% 100%`,
    }}
  >
    {children}
  </span>
);

/** `cv-paper`: the printed page, white in both schemes, set in the resume serif. */
export const Paper: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: color.card,
      color: color.ink,
      fontFamily: resume,
      borderRadius: 4,
      boxShadow: `0 0 0 1px ${color.pageRule}, 0 1px 2px hsl(153 18% 9% / 0.06)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** The mouse pointer, moved between keyframes, with a ripple on each click. */
export const Cursor: React.FC<{ path: PathKey[]; clicks?: number[] }> = ({ path, clicks = [] }) => {
  const frame = useCurrentFrame();
  const { x, y } = pointerAt(frame, path);
  const appear = progress(frame, path[0][0], path[0][0] + 6);
  return (
    <>
      {clicks.map((click) => {
        const t = (frame - click) / 12;
        if (t < 0 || t > 1) return null;
        const size = 6 + t * 26;
        return (
          <div
            key={click}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'hsl(160 56% 27% / 0.22)',
              opacity: 1 - t,
            }}
          />
        );
      })}
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: x - 4,
          top: y - 3,
          opacity: appear,
          filter: 'drop-shadow(0 1px 2px rgba(19,27,23,0.35))',
        }}
      >
        <path
          d="M5 3l14 8-6 1.6L10 19z"
          fill="hsl(153 16% 11%)"
          stroke="#fff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};

export const BrandMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    aria-hidden="true"
    fill="none"
    strokeWidth={4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke={color.ink} d="M41 27V17L31 7H15a6 6 0 0 0-6 6v38a6 6 0 0 0 6 6h9" />
    <path stroke={color.ink} d="M31 7v7a3 3 0 0 0 3 3h7" />
    <path stroke={color.ink} d="M17 32h11M17 42h7" />
    <path fill={color.primary} d="M20 14.5l4 4-4 4-4-4z" />
    <path stroke={color.primary} d="M24 57c15 0 25.5-8 32.5-25.5M47.5 34.5l9-3 1.8 9.6" />
  </svg>
);

/** The app's top bar: the mark, a breadcrumb and the account avatar. */
export const TopBar: React.FC<{ crumbs: string[] }> = ({ crumbs }) => (
  <div
    style={{
      position: 'absolute',
      inset: '0 0 auto 0',
      height: 40,
      background: color.desk,
      boxShadow: `0 1px 0 hsl(146 9% 83% / 0.5)`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 16px',
      fontFamily: sans,
      fontSize: 12.5,
      color: color.muted,
    }}
  >
    <BrandMark />
    <div style={{ width: 1, height: 16, background: color.border }} />
    {crumbs.map((crumb, index) => {
      const last = index === crumbs.length - 1;
      return (
        <div key={crumb} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {index > 0 ? <ChevronRight size={12} color={color.muted} /> : null}
          <span
            style={{
              color: last ? color.ink : color.muted,
              fontWeight: last ? 500 : 400,
            }}
          >
            {crumb}
          </span>
        </div>
      );
    })}
    <div style={{ flex: 1 }} />
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: color.secondary,
        fontSize: 11,
        fontWeight: 600,
        color: color.muted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      A
    </div>
  </div>
);
