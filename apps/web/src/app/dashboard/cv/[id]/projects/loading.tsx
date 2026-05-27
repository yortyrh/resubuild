import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvProjectsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="projects" />
    </div>
  );
}
