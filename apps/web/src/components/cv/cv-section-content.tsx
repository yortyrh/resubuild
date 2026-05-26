import { cn } from '@/lib/utils';

interface CvSectionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CvSectionContent({ children, className }: CvSectionContentProps) {
  return <div className={cn('pl-4', className)}>{children}</div>;
}
