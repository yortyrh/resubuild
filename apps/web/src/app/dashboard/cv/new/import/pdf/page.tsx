import { redirect } from 'next/navigation';

/** @deprecated Use `/dashboard/cv/new/import/file` */
export default function ImportPdfPage() {
  redirect('/dashboard/cv/new/import/file');
}
