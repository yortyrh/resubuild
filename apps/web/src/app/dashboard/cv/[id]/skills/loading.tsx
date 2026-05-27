import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';

export default function CvSkillsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading section">
      <CvSectionSkeleton section="skills" />
    </div>
  );
}
