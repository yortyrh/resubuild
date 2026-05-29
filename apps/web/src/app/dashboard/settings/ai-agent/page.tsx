import { AiAgentSettings } from '@/components/settings/ai-agent-settings';

function isSafeReturnTo(path: string | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

export default async function AiAgentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; returnLabel?: string }>;
}) {
  const { returnTo, returnLabel } = await searchParams;
  const backHref = isSafeReturnTo(returnTo) ? returnTo : undefined;

  return <AiAgentSettings backHref={backHref} backLabel={returnLabel} />;
}
