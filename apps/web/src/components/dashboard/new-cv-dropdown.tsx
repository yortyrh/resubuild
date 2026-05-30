'use client';

import { ChevronDown, FileJson, FileText, Globe, PenLine, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NEW_CV_ROUTES = [
  {
    href: '/dashboard/cv/new/import/pdf',
    label: 'Import PDF',
    icon: FileText,
  },
  {
    href: '/dashboard/cv/new/create',
    label: 'Create manually',
    icon: PenLine,
  },
  {
    href: '/dashboard/cv/new/import/url',
    label: 'Import from URL',
    icon: Globe,
  },
  {
    href: '/dashboard/cv/new/import/json',
    label: 'Import JSON file',
    icon: FileJson,
  },
  {
    href: '/dashboard/cv/new/import/markdown',
    label: 'Import Markdown',
    icon: FileText,
  },
] as const;

export interface NewCvDropdownProps {
  label?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function NewCvDropdown({ label = 'New CV', size = 'default' }: NewCvDropdownProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size={size}>
          <Plus className="mr-2 h-4 w-4" />
          {label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {NEW_CV_ROUTES.map((route) => (
          <DropdownMenuItem key={route.href} asChild>
            <Link href={route.href} className="flex items-center gap-2">
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { NEW_CV_ROUTES };
