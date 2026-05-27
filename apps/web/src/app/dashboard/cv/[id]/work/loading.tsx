import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvWorkLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="work" />
    </div>
  );
}
