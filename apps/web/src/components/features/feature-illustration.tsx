import { Download, FileUp, KeyRound, Mail, PenLine, Sparkles, UserPlus } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

type FeatureIllustrationProps = {
  id: string;
};

function MockLine({
  variant = 'default',
  className = '',
}: {
  variant?: 'default' | 'short' | 'accent' | 'green';
  className?: string;
}) {
  const variantClass =
    variant === 'short'
      ? 'landing-mock-line--short'
      : variant === 'accent'
        ? 'landing-mock-line--accent'
        : variant === 'green'
          ? 'landing-mock-line--green'
          : '';

  return <div className={`landing-mock-line ${variantClass} ${className}`.trim()} />;
}

function IllustrationFrame({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="landing-feature-illustration">
      <div className="landing-feature-illustration-header">
        <span className="landing-feature-illustration-icon">
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
        </span>
        <span>{label}</span>
      </div>
      <div className="landing-feature-illustration-body">{children}</div>
    </div>
  );
}

function PdfImportIllustration() {
  return (
    <IllustrationFrame label="PDF import" icon={FileUp}>
      <div className="landing-pdf-mock">
        <MockLine variant="accent" />
        <MockLine />
        <MockLine variant="short" />
        <MockLine className="mt-3" />
        <MockLine />
      </div>
      <div className="landing-feature-illustration-arrow" aria-hidden="true">
        →
      </div>
      <div className="landing-cv-mock">
        <p className="mb-2 text-xs font-semibold text-[var(--landing-primary-600)]">
          Jane Developer
        </p>
        <MockLine variant="accent" />
        <MockLine variant="short" />
        <MockLine variant="green" className="mt-2" />
      </div>
    </IllustrationFrame>
  );
}

function ApplicationPrepareIllustration() {
  return (
    <IllustrationFrame label="Job tailoring" icon={Sparkles}>
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div className="landing-feature-illustration-panel">
          <p className="landing-feature-illustration-panel-label">Job post</p>
          <MockLine variant="accent" />
          <MockLine />
          <MockLine variant="short" />
        </div>
        <div className="landing-feature-illustration-panel landing-feature-illustration-panel--accent">
          <p className="landing-feature-illustration-panel-label">Tailored CV</p>
          <MockLine variant="green" />
          <MockLine variant="short" />
          <MockLine />
        </div>
      </div>
    </IllustrationFrame>
  );
}

function CoverLetterIllustration() {
  return (
    <IllustrationFrame label="Cover letter" icon={PenLine}>
      <div className="landing-cv-mock flex-1">
        <MockLine variant="accent" />
        <MockLine />
        <MockLine />
        <MockLine variant="short" className="mt-3" />
        <MockLine />
      </div>
      <div className="landing-feature-illustration-action">
        <Download size={14} strokeWidth={2} aria-hidden="true" />
        Export PDF
      </div>
    </IllustrationFrame>
  );
}

function McpKeyIllustration() {
  return (
    <IllustrationFrame label="MCP API" icon={KeyRound}>
      <div className="landing-feature-illustration-code">
        <span className="text-[var(--landing-accent-500)]">POST</span> /mcp/resume
      </div>
      <div className="landing-feature-illustration-code landing-feature-illustration-code--muted">
        Authorization: Bearer rb_live_••••
      </div>
      <div className="landing-feature-illustration-key">rb_live_8f3k…9x2m</div>
    </IllustrationFrame>
  );
}

function LoginIllustration() {
  return (
    <IllustrationFrame label="Passwordless sign-in" icon={Mail}>
      <div className="landing-feature-illustration-field">you@company.com</div>
      <div className="landing-feature-illustration-codes">
        {['4', '8', '2', '1', '9', '0'].map((digit) => (
          <span key={digit} className="landing-feature-illustration-code-digit">
            {digit}
          </span>
        ))}
      </div>
    </IllustrationFrame>
  );
}

function RegisterIllustration() {
  return (
    <IllustrationFrame label="Create account" icon={UserPlus}>
      <div className="landing-feature-illustration-field">Email address</div>
      <div className="landing-feature-illustration-field">Password</div>
      <div className="landing-feature-illustration-action landing-feature-illustration-action--primary">
        Create account
      </div>
    </IllustrationFrame>
  );
}

function EditorExportIllustration() {
  return (
    <IllustrationFrame label="Editor & export" icon={PenLine}>
      <div className="landing-cv-mock flex-1">
        <p className="mb-2 text-xs font-semibold text-[var(--landing-primary-600)]">Experience</p>
        <MockLine variant="accent" />
        <MockLine />
        <MockLine variant="short" className="mt-3" />
      </div>
      <div className="landing-feature-illustration-action landing-feature-illustration-action--primary">
        <Download size={14} strokeWidth={2} aria-hidden="true" />
        Export PDF
      </div>
    </IllustrationFrame>
  );
}

const ILLUSTRATIONS: Record<string, () => ReactNode> = {
  'pdf-import': PdfImportIllustration,
  'application-prepare': ApplicationPrepareIllustration,
  'cover-letter-pdf': CoverLetterIllustration,
  'mcp-key': McpKeyIllustration,
  'login-passwordless': LoginIllustration,
  register: RegisterIllustration,
  'editor-export': EditorExportIllustration,
};

export function FeatureIllustration({ id }: FeatureIllustrationProps) {
  const Illustration = ILLUSTRATIONS[id] ?? PdfImportIllustration;
  return <Illustration />;
}
