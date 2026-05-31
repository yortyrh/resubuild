import { ApplicationWorkspace } from '@/components/applications/application-workspace';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationWorkspace id={id} />;
}
