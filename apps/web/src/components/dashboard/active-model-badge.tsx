'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { ProviderIcon } from '@/components/ai/provider-icon';
import { formatTokens } from '@/lib/ai-model-display';
import { useAiAgentActive } from '@/lib/queries/ai-agent-queries';
import { cn } from '@/lib/utils';

const SETTINGS_HREF = '/dashboard/settings/ai-agent';

/**
 * The AI model the user's AI features run on, always visible in the dashboard
 * top bar. Links to the AI agent settings.
 */
export function ActiveModelBadge({ compact = false }: { compact?: boolean }) {
  const { data: active, isLoading } = useAiAgentActive();
  if (isLoading || !active) return null;

  const base =
    'hover:bg-accent text-foreground inline-flex max-w-64 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors';

  if (active.reconfigurationRequired) {
    return (
      <Link
        href={SETTINGS_HREF}
        className={cn(base, 'text-amber-800')}
        title="The saved AI key can no longer be read — open AI settings"
      >
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span className={cn(compact && 'sr-only')}>Re-enter AI key</span>
      </Link>
    );
  }

  if (active.source === 'included') {
    const remaining = active.usage ? formatTokens(active.usage.remaining) : null;
    if (active.exhausted) {
      return (
        <Link
          href={SETTINGS_HREF}
          className={cn(base, 'text-amber-800')}
          title="Included AI is used up for this month — add your own API key"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className={cn(compact && 'sr-only')}>Included AI used up</span>
        </Link>
      );
    }
    const label = `AI model: ${active.displayName ?? 'Included AI'}`;
    return (
      <Link
        href={SETTINGS_HREF}
        className={base}
        aria-label={remaining ? `${label}, ${remaining} tokens left this month` : label}
        title={`${label}${active.modelDisplayName ? ` (${active.modelDisplayName})` : ''}${
          remaining ? ` — ${remaining} tokens left this month` : ''
        }`}
      >
        <ProviderIcon providerId={active.providerId} className="size-4" />
        <span className={cn('truncate', compact && 'sr-only')}>
          {active.displayName ?? 'Included AI'}
        </span>
        {remaining && !compact ? (
          <span className="text-muted-foreground shrink-0">· {remaining} left</span>
        ) : null}
      </Link>
    );
  }

  if (!active.configured || !active.modelId) {
    return (
      <Link href={SETTINGS_HREF} className={cn(base, 'text-muted-foreground')}>
        <ProviderIcon className="size-4" />
        <span className={cn(compact && 'sr-only')}>Set up AI</span>
      </Link>
    );
  }

  const name = active.displayName ?? active.modelId;
  const detail =
    active.label && active.modelDisplayName
      ? `${active.providerDisplayName} · ${active.modelDisplayName}`
      : undefined;

  return (
    <Link
      href={SETTINGS_HREF}
      className={base}
      aria-label={`AI model: ${name}`}
      title={detail ? `AI model: ${name} (${detail})` : `AI model: ${name}`}
    >
      <ProviderIcon providerId={active.providerId} className="size-4" />
      <span className={cn('truncate', compact && 'sr-only')}>{name}</span>
    </Link>
  );
}
