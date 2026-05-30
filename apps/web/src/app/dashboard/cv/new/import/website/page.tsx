import { redirect } from 'next/navigation';

/** @deprecated Use `/dashboard/cv/new/import/url` */
export default function ImportWebsiteRedirectPage() {
  redirect('/dashboard/cv/new/import/url');
}
