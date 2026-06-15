import { FeatureIllustration } from '@/components/features/feature-illustration';
import type { RecordingEntry } from '@/lib/recordings';

export function FeatureCard({ id, title, caption }: RecordingEntry) {
  return (
    <article className="landing-feature-detail-card">
      <FeatureIllustration id={id} />
      <h3 className="landing-feature-detail-title">{title}</h3>
      <p className="landing-feature-detail-desc">{caption}</p>
    </article>
  );
}
