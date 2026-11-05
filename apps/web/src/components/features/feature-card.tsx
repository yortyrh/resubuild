import { FeatureIllustration } from '@/components/features/feature-illustration';
import type { RecordingEntry } from '@/lib/recordings';

export function FeatureCard({ id, title, caption }: RecordingEntry) {
  return (
    <article className="flex flex-col gap-3">
      <FeatureIllustration id={id} />
      <h3 className="wide mt-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{caption}</p>
    </article>
  );
}
