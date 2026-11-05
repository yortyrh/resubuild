'use client';

import { ProviderIcon } from '@/components/ai/provider-icon';
import { Button } from '@/components/ui/button';
import { formatTokens } from '@/lib/ai-model-display';
import type { AiIncludedStatus } from '@/lib/api';

export interface IncludedAiCardProps {
  status: AiIncludedStatus;
  isActive: boolean;
  busy?: boolean;
  onSelect: () => void;
}

/** The app-funded "included" models: what they run on, this month's usage, and a switch. */
export function IncludedAiCard({ status, isActive, busy, onSelect }: IncludedAiCardProps) {
  const usage = status.usage;
  const percent = usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const resetsOn = usage
    ? new Date(usage.resetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  const usedUp = Boolean(usage && usage.remaining <= 0);

  return (
    <section
      className="surface-soft text-card-foreground space-y-3 p-4"
      aria-labelledby="included-ai"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="included-ai" className="font-medium">
            Resubuild included AI
            {isActive ? (
              <span className="bg-primary/10 text-primary ml-2 rounded px-2 py-0.5 text-xs">
                Active
              </span>
            ) : null}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use AI features without your own API key, up to a monthly allowance.
          </p>
        </div>
        {!isActive ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onSelect}>
            Use included AI
          </Button>
        ) : null}
      </div>

      {status.models.length > 0 ? (
        <ul className="flex flex-wrap gap-3 text-sm" aria-label="Included models">
          {status.models.map((model) => (
            <li
              key={`${model.providerId}-${model.modelDisplayName}`}
              className="flex items-center gap-1.5"
            >
              <ProviderIcon providerId={model.providerId} title={model.providerDisplayName} />
              {model.providerDisplayName} · {model.modelDisplayName}
            </li>
          ))}
        </ul>
      ) : null}

      {usage ? (
        <div className="space-y-1">
          <div
            className="bg-muted h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Included AI used this month"
            aria-valuemin={0}
            aria-valuemax={usage.limit}
            aria-valuenow={Math.min(usage.used, usage.limit)}
          >
            <div
              className={usedUp ? 'h-full bg-amber-500' : 'bg-primary h-full'}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {formatTokens(usage.used)} of {formatTokens(usage.limit)} tokens used this month ·
            resets {resetsOn}
          </p>
        </div>
      ) : null}

      {usedUp ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          You have used this month's included AI. Add your own API key below to keep going.
        </p>
      ) : !status.available ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Included AI has reached this month's budget. Add your own API key below to keep going.
        </p>
      ) : null}
    </section>
  );
}
