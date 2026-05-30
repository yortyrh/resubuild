import { redirect } from 'next/navigation';

/** @deprecated Use `/dashboard/cv/new/import/file` */
export default function ImportMarkdownPage() {
  redirect('/dashboard/cv/new/import/file');
}
