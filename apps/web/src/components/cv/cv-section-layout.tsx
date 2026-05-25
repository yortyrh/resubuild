'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CvSectionNav } from './cv-section-nav-links';

interface CvSectionLayoutProps {
  cvId: string;
  children: React.ReactNode;
}

export function CvSectionLayout({ cvId, children }: CvSectionLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden w-48 shrink-0 md:block">
        <div className="sticky top-6">
          <CvSectionNav cvId={cvId} />
        </div>
      </aside>

      {/* Mobile drawer trigger + Sheet */}
      <div className="md:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="mb-4 gap-2">
              <Menu className="h-4 w-4" />
              Sections
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader className="mb-4">
              <SheetTitle>CV Sections</SheetTitle>
            </SheetHeader>
            <CvSectionNav cvId={cvId} onSelect={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
