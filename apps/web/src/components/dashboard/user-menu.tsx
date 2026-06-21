'use client';

import { Settings, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/lib/queries/auth-mutations';
import { useAuthMe } from '@/lib/queries/auth-queries';

export function UserMenu() {
  const logout = useLogout();
  const { data: me } = useAuthMe();
  const [avatarErrored, setAvatarErrored] = useState(false);

  const picture = me?.user?.picture;
  const showAvatar = typeof picture === 'string' && picture.length > 0 && !avatarErrored;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="User menu">
          {showAvatar ? (
            // biome-ignore lint/performance/noImgElement: small inline avatar in icon-sized button
            <img
              className="h-8 w-8 rounded-full object-cover"
              src={picture}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarErrored(true)}
            />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/ai-agent" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            AI agent settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/mcp" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            MCP settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
