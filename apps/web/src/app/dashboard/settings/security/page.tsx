import { SecuritySettings } from '@/components/settings/security-settings';

function isSafeReturnTo(path: string | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; returnLabel?: string }>;
}) {
  const { returnTo, returnLabel } = await searchParams;
  const backHref = isSafeReturnTo(returnTo) ? returnTo : undefined;

  return <SecuritySettings backHref={backHref} backLabel={returnLabel} />;
}
