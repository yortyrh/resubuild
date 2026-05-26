import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Heart,
  HeartHandshake,
  Languages,
  type LucideIcon,
  Share2,
  Trophy,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';

export const CV_SECTION_ICONS: Record<CvSectionSlug, LucideIcon> = {
  basics: User,
  profiles: Share2,
  work: Briefcase,
  volunteer: HeartHandshake,
  education: GraduationCap,
  skills: Wrench,
  projects: FolderKanban,
  awards: Trophy,
  certificates: BadgeCheck,
  publications: BookOpen,
  languages: Languages,
  interests: Heart,
  references: Users,
};

export function getSectionIcon(slug: CvSectionSlug): LucideIcon {
  return CV_SECTION_ICONS[slug];
}
