import { Bot } from 'lucide-react';
import type { IconType } from 'react-icons';
import { SiAnthropic, SiGooglegemini, SiMistralai, SiOpenai, SiX } from 'react-icons/si';
import { cn } from '@/lib/utils';

/** Brand marks for AI providers; others fall back to a generic bot icon. */
const PROVIDER_ICONS: Record<string, IconType> = {
  openai: SiOpenai,
  anthropic: SiAnthropic,
  google: SiGooglegemini,
  mistral: SiMistralai,
  xai: SiX,
};

export interface ProviderIconProps {
  providerId?: string | null;
  className?: string;
  /** Accessible name; omit when the provider name is already shown next to the icon. */
  title?: string;
}

export function ProviderIcon({ providerId, className, title }: ProviderIconProps) {
  const Icon = providerId ? PROVIDER_ICONS[providerId] : undefined;
  const a11y = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };
  if (!Icon) {
    return <Bot className={cn('size-4 shrink-0', className)} {...a11y} />;
  }
  return (
    <Icon
      className={cn('size-4 shrink-0', className)}
      data-provider-icon={providerId ?? undefined}
      {...a11y}
    />
  );
}
