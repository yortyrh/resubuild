/** SEO keywords aligned with Google Trends selections (underlined queries). */
export const seoKeywords = [
  'best resume',
  'resume skills',
  'best resume templates',
  'resume templates',
  'ai resume',
  'what is a resume summary',
  'how to write a resume',
  'how to make a resume stand out',
  'professional resume',
  'sample resume',
  'best resume builder',
  'resume vs cv',
  'resume format',
] as const;

export type SeoFaqItem = {
  question: string;
  answer: string;
};

/** Trend-driven Q&A for FAQPage schema and the marketing FAQ section. */
export const seoFaqItems: SeoFaqItem[] = [
  {
    question: 'What is a resume summary?',
    answer:
      'A resume summary is a short paragraph at the top of your resume — usually two to four sentences — that highlights your experience, core skills, and the value you bring to a role. It replaces an objective on modern resumes and helps recruiters scan your profile quickly. Resubuild lets you edit your summary alongside every other section in a clean MIT-format layout.',
  },
  {
    question: 'What are the best resume templates?',
    answer:
      'The best resume templates use clear hierarchy, readable typography, and consistent spacing so recruiters can scan experience, skills, and education in seconds. Avoid cluttered designs with heavy graphics that break applicant tracking systems. Resubuild uses a proven MIT-format template optimized for clarity and one-click PDF export.',
  },
  {
    question: 'Which resume skills should I include?',
    answer:
      'List resume skills that match the job description: a mix of hard skills (tools, languages, certifications) and soft skills (communication, leadership) backed by evidence in your experience bullets. Group related skills and prioritize what the role asks for. Resubuild imports skills from your existing PDF and keeps them editable in structured JSON Resume format.',
  },
  {
    question: 'How do I write the best resume?',
    answer:
      'Start with a strong summary, quantify achievements in each role, tailor keywords to the job posting, and keep formatting consistent. Lead with impact, not duties. Upload your current PDF to Resubuild to extract structured data, refine the content in the editor, and export a polished professional resume.',
  },
  {
    question: 'How can AI help build my resume?',
    answer:
      'An AI resume workflow can extract text and structure from an existing PDF, suggest clearer phrasing, and speed up tailoring for each application. Resubuild uses AI for PDF import and job-specific tailoring while you stay in control of every field before export — no black-box rewrites.',
  },
  {
    question: 'How do I make a resume stand out?',
    answer:
      'Use measurable results in bullet points, mirror keywords from the job listing, keep the layout scannable, and put your strongest credentials above the fold. A concise summary and well-grouped resume skills help you stand out without flashy design. Resubuild makes iteration fast so you can tailor and export for each opportunity.',
  },
  {
    question: 'How do I write a resume from scratch?',
    answer:
      'Outline contact info, summary, experience, education, and skills; then expand each role with action verbs and outcomes. If you already have an old CV, import it instead of starting blank — Resubuild parses PDF, Word, Markdown, or JSON into editable sections you can refine and export.',
  },
  {
    question: 'What is the difference between a resume and a CV?',
    answer:
      'In the U.S., a resume is typically one to two pages and tailored per job; a CV (curriculum vitae) is longer and used in academia or research. In many countries "CV" and "resume" mean the same thing. Resubuild exports a concise, job-ready document in standard PDF format regardless of what you call it.',
  },
  {
    question: 'What is the best resume builder?',
    answer:
      'The best resume builder combines reliable import from existing files, structured editing, print-faithful preview, and export without watermarks. Resubuild focuses on PDF-in to PDF-out with JSON Resume under the hood, so your data stays portable and private in your account.',
  },
];

/** Product-specific FAQ entries shown after trend-driven SEO questions. */
export const productFaqItems: SeoFaqItem[] = [
  {
    question: 'Is the data private?',
    answer:
      'Yes. Your CVs are stored under your Supabase account with row-level security; only you can read or write them. Resubuild does not sell, share, or train models on your data.',
  },
  {
    question: 'What format is the export?',
    answer:
      'PDF, HTML, and JSON Resume. The PDF is generated from a print-faithful MIT-format template — what you see in the preview is what you get in the download.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'To save and manage multiple CVs, yes. You can try the live demo anonymously and only sign up when you want to keep your work.',
  },
  {
    question: 'Can I import a non-PDF CV?',
    answer:
      'Yes. Import from file accepts JSON, PDF, Markdown, Word (.docx), and image formats (PNG/JPEG/WebP). JSON parses locally; the other formats use the configured import LLM.',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'Resubuild is free during the public beta. We will announce pricing before any paid plan is introduced.',
  },
];

export const marketingFaqItems: SeoFaqItem[] = [...seoFaqItems, ...productFaqItems];
