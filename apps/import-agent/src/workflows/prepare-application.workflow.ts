import { Agent } from '@mastra/core/agent';
import { sanitizeAiTypography } from '@resumind/types';
import type {
  CvSummaryForRanking,
  JobSummary,
  PrepareApplicationWorkflowInput,
  PrepareApplicationWorkflowResult,
  TailorCvPatch,
  UpdateApplicationWorkflowInput,
  UpdateApplicationWorkflowResult,
} from '../prepare-application.types';
import { extractPdfTextTool } from '../tools/extract-pdf-text.tool';
import { fetchHtmlTool } from '../tools/fetch-html.tool';
import { toAgentModelConfig } from './agent-model-config';

function sanitizeJobSummary(summary: JobSummary): JobSummary {
  return {
    title: sanitizeAiTypography(summary.title),
    company: sanitizeAiTypography(summary.company),
    requirements: summary.requirements.map(sanitizeAiTypography),
    keywords: summary.keywords.map(sanitizeAiTypography),
    language: summary.language,
  };
}

function sanitizeTailorCvPatch(patch: TailorCvPatch): TailorCvPatch {
  const result: TailorCvPatch = {};

  if (patch.basics?.label) {
    result.basics = { label: sanitizeAiTypography(patch.basics.label) };
  }

  for (const key of ['work', 'volunteer', 'projects'] as const) {
    const entries = patch[key];
    if (!entries?.length) continue;

    result[key] = entries.map((entry) => ({
      index: entry.index,
      summary: entry.summary ? sanitizeAiTypography(entry.summary) : undefined,
      highlights: entry.highlights?.map(sanitizeAiTypography),
    }));
  }

  return result;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateJsonFromPrompt(
  modelId: string,
  apiKey: string,
  instructions: string,
  prompt: string,
  generate?: PrepareApplicationWorkflowInput['generateJson'],
): Promise<Record<string, unknown>> {
  if (generate) {
    return generate(prompt);
  }

  const agent = new Agent({
    id: 'prepare-application-agent',
    name: 'prepare-application-agent',
    instructions,
    model: toAgentModelConfig(modelId, apiKey),
  });

  const response = await agent.generate(prompt);

  const text = response.text.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('LLM did not return JSON');
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
}

export async function normalizeJobPostingText(
  input: Pick<
    PrepareApplicationWorkflowInput,
    | 'sourceType'
    | 'url'
    | 'text'
    | 'pdfBuffer'
    | 'imageBuffer'
    | 'imageMimeType'
    | 'modelId'
    | 'apiKey'
    | 'transcribeImage'
    | 'fetchJobUrl'
  >,
): Promise<string> {
  if (input.sourceType === 'text') {
    const trimmed = input.text?.trim();
    if (!trimmed) throw new Error('Job text is empty');
    return trimmed;
  }

  if (input.sourceType === 'url') {
    const url = input.url?.trim();
    if (!url) throw new Error('Job URL is required');
    try {
      const text = input.fetchJobUrl
        ? await input.fetchJobUrl(url)
        : stripHtmlToText((await fetchHtmlTool({ url })).content);
      if (!text) throw new Error('No text extracted from page');
      return text;
    } catch {
      throw new Error('Could not fetch job posting URL. Try pasting the job description as text.');
    }
  }

  if (input.sourceType === 'pdf') {
    if (!input.pdfBuffer?.length) throw new Error('PDF buffer is required');
    const extracted = await extractPdfTextTool(input.pdfBuffer, {
      modelId: input.modelId,
      apiKey: input.apiKey,
    });
    if (!extracted.text.trim()) throw new Error('No text extracted from PDF');
    return extracted.text.trim();
  }

  if (input.sourceType === 'image') {
    if (!input.imageBuffer?.length) throw new Error('Image buffer is required');
    if (input.transcribeImage) {
      return input.transcribeImage(input.imageBuffer, input.imageMimeType ?? 'image/png');
    }

    const agent = new Agent({
      id: 'job-image-transcriber',
      name: 'job-image-transcriber',
      instructions:
        'Transcribe all visible job posting text from the image. Return plain text only, preserving paragraphs.',
      model: toAgentModelConfig(input.modelId, input.apiKey),
    });

    const response = await agent.generate([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the full job posting text from this image.',
          },
          {
            type: 'image',
            image: input.imageBuffer,
            mimeType: input.imageMimeType ?? 'image/png',
          },
        ],
      },
    ] as never);

    const text = response.text.trim();
    if (!text) throw new Error('Could not read job posting from image');
    return sanitizeAiTypography(text);
  }

  throw new Error(`Unsupported source type: ${input.sourceType satisfies never}`);
}

export async function summarizeJobPostingTool(
  jobRawText: string,
  modelId: string,
  apiKey: string,
  generate?: PrepareApplicationWorkflowInput['generateJson'],
): Promise<JobSummary> {
  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Summarize job postings into structured JSON fields.',
    `Job posting:\n\n${jobRawText.slice(0, 12000)}\n\nReturn JSON with title, company, requirements (string array), keywords (string array), language (ISO 639-1 code).`,
    generate,
  );

  return sanitizeJobSummary({
    title: String(parsed.title ?? 'Role'),
    company: String(parsed.company ?? 'Company'),
    requirements: Array.isArray(parsed.requirements)
      ? parsed.requirements.map(String).slice(0, 20)
      : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).slice(0, 30) : [],
    language: parsed.language ? String(parsed.language) : undefined,
  });
}

export async function rankCvForJobTool(
  jobSummary: JobSummary,
  jobRawText: string,
  cvSummaries: CvSummaryForRanking[],
  userMessage: string | undefined,
  modelId: string,
  apiKey: string,
  generate?: PrepareApplicationWorkflowInput['generateJson'],
): Promise<{ sourceCvId: string; rationale: string }> {
  if (cvSummaries.length === 0) {
    throw new Error('No CVs available for matching');
  }

  if (cvSummaries.length === 1) {
    return {
      sourceCvId: cvSummaries[0].id,
      rationale: sanitizeAiTypography('Only CV in library — selected automatically.'),
    };
  }

  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Pick the best matching CV id for a job posting.',
    `Job:\n${jobSummary.title} at ${jobSummary.company}\n\nPosting excerpt:\n${jobRawText.slice(0, 4000)}\n\nUser note:\n${userMessage ?? '(none)'}\n\nCVs:\n${JSON.stringify(cvSummaries, null, 2)}\n\nReturn JSON with selectedCvId and rationale.`,
    generate,
  );

  const selectedCvId = String(parsed.selectedCvId ?? parsed.sourceCvId ?? '');
  const rationale = String(parsed.rationale ?? 'Best match for posting requirements.');
  const match = cvSummaries.find((cv) => cv.id === selectedCvId);

  if (!match) {
    return {
      sourceCvId: cvSummaries[0].id,
      rationale: sanitizeAiTypography(`${rationale} (fallback to first CV)`),
    };
  }

  return {
    sourceCvId: match.id,
    rationale: sanitizeAiTypography(rationale),
  };
}

export async function tailorCvPatchTool(
  jobSummary: JobSummary,
  jobRawText: string,
  cvSummary: CvSummaryForRanking,
  userMessage: string | undefined,
  modelId: string,
  apiKey: string,
  generate?: PrepareApplicationWorkflowInput['generateJson'],
): Promise<TailorCvPatch> {
  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Produce JSON Resume clone patches. Use Markdown bold in summaries/highlights. Omit irrelevant highlights.',
    `Job: ${jobSummary.title} at ${jobSummary.company}\n\nPosting:\n${jobRawText.slice(0, 4000)}\n\nUser note:\n${userMessage ?? '(none)'}\n\nBase CV summary:\n${JSON.stringify(cvSummary, null, 2)}\n\nReturn JSON patch with optional basics.label and arrays work/volunteer/projects of { index, summary?, highlights? }.`,
    generate,
  );

  const patch: TailorCvPatch = {};
  if (parsed.basics && typeof parsed.basics === 'object') {
    const basics = parsed.basics as { label?: string };
    if (basics.label) patch.basics = { label: basics.label };
  }

  for (const key of ['work', 'volunteer', 'projects'] as const) {
    if (Array.isArray(parsed[key])) {
      patch[key] = (
        parsed[key] as Array<{ index: number; summary?: string; highlights?: string[] }>
      ).map((entry) => ({
        index: Number(entry.index),
        summary: entry.summary,
        highlights: Array.isArray(entry.highlights) ? entry.highlights.map(String) : undefined,
      }));
    }
  }

  return sanitizeTailorCvPatch(patch);
}

export function resolveCandidateName(
  cvSummary: CvSummaryForRanking,
  accountDisplayName?: string,
): string | undefined {
  const fromCv = cvSummary.name?.trim();
  if (fromCv) return fromCv;
  const fromAccount = accountDisplayName?.trim();
  if (fromAccount) return fromAccount;
  return undefined;
}

/** Replace common LLM name placeholders with the resolved candidate name. */
export function applyCoverLetterCandidateName(letter: string, candidateName: string): string {
  const name = candidateName.trim();
  if (!name) return letter;

  return letter
    .replace(/\*\*\[Your Name\]\*\*/gi, name)
    .replace(/\*\*\[your name\]\*\*/gi, name)
    .replace(/\[Your Name\]/gi, name)
    .replace(/\[your name\]/gi, name)
    .replace(/\[Nom\]/gi, name)
    .replace(/\[nom\]/gi, name);
}

export interface CoverLetterDraft {
  coverLetter: string;
  emailSubject: string;
}

export function buildFallbackEmailSubject(
  jobSummary: Pick<JobSummary, 'title' | 'company'>,
): string {
  const title = jobSummary.title?.trim() || 'Role';
  const company = jobSummary.company?.trim();
  if (company && company !== 'Company') {
    return `Application — ${title} at ${company}`;
  }
  return `Application — ${title}`;
}

function finalizeCoverLetterDraft(
  letter: string,
  emailSubject: string | undefined,
  jobSummary: JobSummary,
  candidateName: string | undefined,
): CoverLetterDraft {
  if (!letter.trim()) throw new Error('Cover letter generation returned empty text');

  let coverLetter = sanitizeAiTypography(letter.trim());
  if (candidateName) {
    coverLetter = applyCoverLetterCandidateName(coverLetter, candidateName);
  }

  const subject = emailSubject?.trim()
    ? sanitizeAiTypography(emailSubject.trim())
    : buildFallbackEmailSubject(jobSummary);

  return { coverLetter, emailSubject: subject };
}

export async function draftCoverLetterTool(
  jobSummary: JobSummary,
  jobRawText: string,
  cvSummary: CvSummaryForRanking,
  userMessage: string | undefined,
  modelId: string,
  apiKey: string,
  candidateName: string | undefined,
  generateText?: PrepareApplicationWorkflowInput['generateText'],
  generateJson?: PrepareApplicationWorkflowInput['generateJson'],
): Promise<CoverLetterDraft> {
  const languageHint =
    userMessage?.match(/\b(english|french|german|spanish|italian|portuguese)\b/i)?.[0] ??
    jobSummary.language ??
    'the job posting language';

  const nameLine = candidateName
    ? `Candidate full name: ${candidateName} (sign the letter with this exact name — never use placeholders like [Your Name])`
    : 'Candidate full name: unknown — omit a signature line rather than using placeholders';

  const prompt = `Write a professional cover letter for this job application.
Language: ${languageHint}
Job: ${jobSummary.title} at ${jobSummary.company}
Posting excerpt:\n${jobRawText.slice(0, 3000)}
${nameLine}
Candidate headline: ${cvSummary.label ?? cvSummary.title}
Candidate summary: ${cvSummary.summary ?? '(none)'}
User instructions: ${userMessage ?? '(none)'}
Return JSON with:
- emailSubject: a concise, professional email subject line in the same language as the letter (no "Re:" prefix)
- coverLetter: Markdown body only (multi-paragraph letter ending with a closing and the candidate's full name when known)`;

  if (generateText) {
    const letter = await generateText(prompt);
    return finalizeCoverLetterDraft(letter, undefined, jobSummary, candidateName);
  }

  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Draft concise, professional cover letters. Return JSON with emailSubject and coverLetter (Markdown). Use the candidate full name for the signature. Never output placeholder text such as [Your Name].',
    prompt,
    generateJson,
  );

  const letter = typeof parsed.coverLetter === 'string' ? parsed.coverLetter : '';
  const emailSubject = typeof parsed.emailSubject === 'string' ? parsed.emailSubject : undefined;

  return finalizeCoverLetterDraft(letter, emailSubject, jobSummary, candidateName);
}

export async function runPrepareApplicationWorkflow(
  input: PrepareApplicationWorkflowInput,
): Promise<PrepareApplicationWorkflowResult> {
  const errors: string[] = [];

  try {
    input.onProgress?.('normalizing');
    const jobRawText = await normalizeJobPostingText(input);

    input.onProgress?.('summarizing');
    const jobSummary = await summarizeJobPostingTool(
      jobRawText,
      input.modelId,
      input.apiKey,
      input.generateJson,
    );

    input.onProgress?.('selecting_cv');
    let sourceCvId = input.sourceCvId;
    let selectionRationale = 'User selected base CV.';

    if (sourceCvId) {
      const owned = input.cvSummaries.some((cv) => cv.id === sourceCvId);
      if (!owned) throw new Error('Selected source CV is not in your library');
    } else {
      const ranked = await rankCvForJobTool(
        jobSummary,
        jobRawText,
        input.cvSummaries,
        input.userMessage,
        input.modelId,
        input.apiKey,
        input.generateJson,
      );
      sourceCvId = ranked.sourceCvId;
      selectionRationale = ranked.rationale;
    }

    const cvSummary = input.cvSummaries.find((cv) => cv.id === sourceCvId) ?? input.cvSummaries[0];

    input.onProgress?.('tailoring');
    const tailorPatch = await tailorCvPatchTool(
      jobSummary,
      jobRawText,
      cvSummary,
      input.userMessage,
      input.modelId,
      input.apiKey,
      input.generateJson,
    );

    input.onProgress?.('drafting_letter');
    const candidateName = resolveCandidateName(cvSummary, input.accountDisplayName);
    const coverLetterDraft = await draftCoverLetterTool(
      jobSummary,
      jobRawText,
      cvSummary,
      input.userMessage,
      input.modelId,
      input.apiKey,
      candidateName,
      input.generateText,
      input.generateJson,
    );

    return {
      sourceCvId,
      jobSummary,
      jobRawText,
      tailorPatch,
      coverLetter: coverLetterDraft.coverLetter,
      coverLetterEmailSubject: coverLetterDraft.emailSubject,
      selectionRationale: sanitizeAiTypography(selectionRationale),
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Prepare workflow failed');
    return {
      jobSummary: { title: '', company: '', requirements: [], keywords: [] },
      jobRawText: '',
      tailorPatch: {},
      coverLetter: '',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      errors,
    };
  }
}

export async function tailorCvPatchFromResumeTool(
  jobSummary: JobSummary,
  jobRawText: string,
  currentResume: Record<string, unknown>,
  userMessage: string | undefined,
  modelId: string,
  apiKey: string,
  generate?: UpdateApplicationWorkflowInput['generateJson'],
): Promise<TailorCvPatch> {
  const resumeJson = JSON.stringify(currentResume).slice(0, 12000);
  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Revise a tailored JSON Resume clone. Use Markdown bold in summaries/highlights. Omit irrelevant highlights. Return patch JSON only.',
    `Job: ${jobSummary.title} at ${jobSummary.company}\n\nPosting:\n${jobRawText.slice(0, 4000)}\n\nUser update instructions:\n${userMessage ?? '(none)'}\n\nCurrent tailored resume (JSON Resume):\n${resumeJson}\n\nProduce a fresh tailoring patch (not an incremental edit log) with optional basics.label and arrays work/volunteer/projects of { index, summary?, highlights? }. Apply the user instructions to the whole resume.`,
    generate,
  );

  const patch: TailorCvPatch = {};
  if (parsed.basics && typeof parsed.basics === 'object') {
    const basics = parsed.basics as { label?: string };
    if (basics.label) patch.basics = { label: basics.label };
  }

  for (const key of ['work', 'volunteer', 'projects'] as const) {
    if (Array.isArray(parsed[key])) {
      patch[key] = (
        parsed[key] as Array<{ index: number; summary?: string; highlights?: string[] }>
      ).map((entry) => ({
        index: Number(entry.index),
        summary: entry.summary,
        highlights: Array.isArray(entry.highlights) ? entry.highlights.map(String) : undefined,
      }));
    }
  }

  return sanitizeTailorCvPatch(patch);
}

export async function draftCoverLetterFromCurrentTool(
  jobSummary: JobSummary,
  jobRawText: string,
  cvSummary: CvSummaryForRanking,
  currentCoverLetter: string,
  userMessage: string | undefined,
  modelId: string,
  apiKey: string,
  candidateName: string | undefined,
  generateText?: UpdateApplicationWorkflowInput['generateText'],
  generateJson?: UpdateApplicationWorkflowInput['generateJson'],
): Promise<CoverLetterDraft> {
  const languageHint =
    userMessage?.match(/\b(english|french|german|spanish|italian|portuguese)\b/i)?.[0] ??
    jobSummary.language ??
    'the job posting language';

  const nameLine = candidateName
    ? `Candidate full name: ${candidateName} (sign the letter with this exact name — never use placeholders like [Your Name])`
    : 'Candidate full name: unknown — omit a signature line rather than using placeholders';

  const prompt = `Write a new professional cover letter for this job application.
Language: ${languageHint}
Job: ${jobSummary.title} at ${jobSummary.company}
Posting excerpt:\n${jobRawText.slice(0, 3000)}
${nameLine}
Candidate headline: ${cvSummary.label ?? cvSummary.title}
Candidate summary: ${cvSummary.summary ?? '(none)'}
User update instructions: ${userMessage ?? '(none)'}
Previous cover letter draft (use only as style/context — rewrite fully, do not append or chat):
---
${currentCoverLetter.slice(0, 6000)}
---
Return JSON with:
- emailSubject: a concise, professional email subject line in the same language as the letter (no "Re:" prefix)
- coverLetter: Markdown body only (multi-paragraph letter ending with a closing and the candidate's full name when known)`;

  if (generateText) {
    const letter = await generateText(prompt);
    return finalizeCoverLetterDraft(letter, undefined, jobSummary, candidateName);
  }

  const parsed = await generateJsonFromPrompt(
    modelId,
    apiKey,
    'Draft concise, professional cover letters. Return JSON with emailSubject and coverLetter (Markdown). Rewrite fully from context; never output placeholder text such as [Your Name].',
    prompt,
    generateJson,
  );

  const letter = typeof parsed.coverLetter === 'string' ? parsed.coverLetter : '';
  const emailSubject = typeof parsed.emailSubject === 'string' ? parsed.emailSubject : undefined;

  return finalizeCoverLetterDraft(letter, emailSubject, jobSummary, candidateName);
}

export async function runUpdateApplicationWorkflow(
  input: UpdateApplicationWorkflowInput,
): Promise<UpdateApplicationWorkflowResult> {
  const errors: string[] = [];

  try {
    input.onProgress?.('selecting_cv');
    let sourceCvId = input.sourceCvId;
    let selectionRationale = 'User selected base CV.';

    if (sourceCvId) {
      const owned = input.cvSummaries.some((cv) => cv.id === sourceCvId);
      if (!owned) throw new Error('Selected source CV is not in your library');
    } else {
      const ranked = await rankCvForJobTool(
        input.jobSummary,
        input.jobRawText,
        input.cvSummaries,
        input.userMessage,
        input.modelId,
        input.apiKey,
        input.generateJson,
      );
      sourceCvId = ranked.sourceCvId;
      selectionRationale = ranked.rationale;
    }

    const cvSummary = input.cvSummaries.find((cv) => cv.id === sourceCvId) ?? input.cvSummaries[0];

    input.onProgress?.('tailoring');
    const tailorPatch = await tailorCvPatchFromResumeTool(
      input.jobSummary,
      input.jobRawText,
      input.currentResume,
      input.userMessage,
      input.modelId,
      input.apiKey,
      input.generateJson,
    );

    input.onProgress?.('drafting_letter');
    const candidateName = resolveCandidateName(cvSummary, input.accountDisplayName);
    const coverLetterDraft = await draftCoverLetterFromCurrentTool(
      input.jobSummary,
      input.jobRawText,
      cvSummary,
      input.currentCoverLetter,
      input.userMessage,
      input.modelId,
      input.apiKey,
      candidateName,
      input.generateText,
      input.generateJson,
    );

    return {
      sourceCvId,
      tailorPatch,
      coverLetter: coverLetterDraft.coverLetter,
      coverLetterEmailSubject: coverLetterDraft.emailSubject,
      selectionRationale: sanitizeAiTypography(selectionRationale),
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Update workflow failed');
    return {
      tailorPatch: {},
      coverLetter: '',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      errors,
    };
  }
}

export function createPrepareApplicationWorkflow() {
  return { run: runPrepareApplicationWorkflow };
}

export function createUpdateApplicationWorkflow() {
  return { run: runUpdateApplicationWorkflow };
}
