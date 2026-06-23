'use client';

import { Bot, ChevronUp, Cpu, LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/lib/queries/auth-mutations';
import { useAuthMe } from '@/lib/queries/auth-queries';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface UserAvatarProps {
  picture?: string | null;
  fallback: string;
  className?: string;
}

function UserAvatar({ picture, fallback, className }: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const showPicture = typeof picture === 'string' && picture.length > 0 && !errored;

  if (showPicture) {
    return (
      // biome-ignore lint/performance/noImgElement: small inline avatar
      <img
        className={cn('rounded-full object-cover', className)}
        src={picture}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground flex items-center justify-center rounded-full text-sm font-semibold',
        className,
      )}
    >
      {fallback || <UserRound className="size-4" />}
    </div>
  );
}

interface UserInfoProps {
  name: string;
  email: string;
  picture?: string | null;
  size?: 'sm' | 'md';
}

function UserInfo({ name, email, picture, size = 'md' }: UserInfoProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const avatarSize = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  const emailSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar picture={picture} fallback={initials} className={avatarSize} />
      <div className="min-w-0">
        <p className={cn('truncate font-medium', textSize)}>{name}</p>
        <p className={cn('text-muted-foreground truncate', emailSize)}>{email}</p>
      </div>
    </div>
  );
}

export function UserMenu({ collapsed = false }: { collapsed?: boolean } = {}) {
  const logout = useLogout();
  const { data: me } = useAuthMe();

  const name = me?.user?.email?.split('@')[0] ?? 'User';
  const email = me?.user?.email ?? '';
  const picture = me?.user?.picture;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hover:bg-accent/50 flex w-full items-center rounded-md text-left transition-colors',
            collapsed ? 'justify-center' : 'justify-between gap-2 px-2 py-2',
          )}
          aria-label="User menu"
        >
          {collapsed ? (
            <UserAvatar picture={picture} fallback={getInitials(name)} className="size-9 text-sm" />
          ) : (
            <>
              <UserInfo name={name} email={email} picture={picture} size="sm" />
              <ChevronUp className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={collapsed ? 'center' : 'end'}
        side="top"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuLabel className="p-3 font-normal">
          <UserInfo name={name} email={email} picture={picture} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/settings/ai-agent" className="flex items-center gap-2">
            <Bot className="size-4" aria-hidden="true" />
            AI agent
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/settings/mcp" className="flex items-center gap-2">
            <Cpu className="size-4" aria-hidden="true" />
            MCP
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
