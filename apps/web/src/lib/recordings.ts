/**
 * Canonical list of feature recordings.
 * Each entry maps an id (matches the MP4/PNG filename in /public/recordings/)
 * to a title and one-line caption.
 */

export interface RecordingEntry {
  id: string;
  title: string;
  caption: string;
}

export const RECORDINGS: RecordingEntry[] = [
  {
    id: 'pdf-import',
    title: 'Import a PDF CV',
    caption: 'Upload any PDF and Resubuild extracts the structured resume data using AI.',
  },
  {
    id: 'application-prepare',
    title: 'Tailor to a Job',
    caption: "Paste a job description and Resubuild's AI tailors your CV and draft cover letter.",
  },
  {
    id: 'cover-letter-pdf',
    title: 'Export Cover Letter as PDF',
    caption: 'Download a polished PDF of your tailored cover letter in one click.',
  },
  {
    id: 'mcp-key',
    title: 'MCP API Access',
    caption: 'Create an API key and connect Resubuild to any MCP-compatible AI tool.',
  },
  {
    id: 'login-passwordless',
    title: 'Passwordless Sign-In',
    caption: 'Sign in with a single email code — no password needed.',
  },
  {
    id: 'register',
    title: 'Create an Account',
    caption: 'Sign up in seconds with just an email and password.',
  },
  {
    id: 'editor-export',
    title: 'Edit and Export PDF',
    caption: 'Use the clean MIT-format editor and export a polished PDF, no watermarks.',
  },
];
