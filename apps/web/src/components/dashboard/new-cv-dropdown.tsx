'use client';

import { ChevronDown, FileUp, Globe, PenLine, Plus } from 'lucide-react';
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
    href: '/dashboard/cv/new/import/file',
    label: 'Import from file',
    icon: FileUp,
  },
  {
    href: '/dashboard/cv/new/import/url',
    label: 'Import from URL',
    icon: Globe,
  },
  {
    href: '/dashboard/cv/new/create',
    label: 'Create manually',
    icon: PenLine,
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
        <Button size={size} aria-label={label}>
          <Plus className="size-4 shrink-0 sm:mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="ml-2 hidden h-4 w-4 sm:inline" aria-hidden="true" />
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
