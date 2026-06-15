type SectionHeaderProps = {
  label: string;
  title: React.ReactNode;
  subtitle?: string;
};

export function SectionHeader({ label, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <span className="landing-section-label">{label}</span>
      <h2 className="landing-section-title">{title}</h2>
      {subtitle ? <p className="landing-section-subtitle">{subtitle}</p> : null}
    </div>
  );
}
