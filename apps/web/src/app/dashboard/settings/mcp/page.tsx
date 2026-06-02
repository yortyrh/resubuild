import { McpSettings } from '@/components/settings/mcp-settings';

function isSafeReturnTo(path: string | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

export default async function McpSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; returnLabel?: string }>;
}) {
  const { returnTo, returnLabel } = await searchParams;
  const backHref = isSafeReturnTo(returnTo) ? returnTo : undefined;

  return <McpSettings backHref={backHref} backLabel={returnLabel} />;
}
