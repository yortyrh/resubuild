import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE_ID, isValidTemplateId, listTemplates, TEMPLATE_IDS } from './registry';
import { renderResumeHtml } from './render-resume-html';
import {
  getDefaultPresentationConfig,
  mergePresentationConfig,
  visibleSectionOrder,
} from './template-config';
import { assertTemplateIdRenders, sampleResume } from './templates/capd-factory';
import { VISUAL_TEMPLATES } from './visual-templates';

describe('template registry', () => {
  it('lists four visual templates', () => {
    const templates = listTemplates();
    expect(templates).toHaveLength(4);
    expect(TEMPLATE_IDS).toEqual(['classic', 'modern', 'tabular', 'left']);
    expect(TEMPLATE_IDS).toContain(DEFAULT_TEMPLATE_ID);
  });

  it('accepts legacy template ids for validation and rendering', () => {
    expect(isValidTemplateId('mit-classic')).toBe(true);
    expect(isValidTemplateId('capd-alum')).toBe(true);
    expect(isValidTemplateId('nonexistent')).toBe(false);
    const html = renderResumeHtml(sampleResume, 'capd-undergraduate-standard');
    expect(html).toContain('data-template="classic"');
  });

  it('falls back to classic for unknown id when rendering', () => {
    const html = renderResumeHtml(sampleResume, 'does-not-exist');
    expect(html).toContain('id="experience-heading"');
    expect(html).toContain('Jane Doe');
  });

  it('classic smoke render orders experience before education by default', () => {
    const html = renderResumeHtml(sampleResume, DEFAULT_TEMPLATE_ID);
    const experienceIndex = html.indexOf('id="experience-heading"');
    const educationIndex = html.indexOf('id="education-heading"');
    expect(experienceIndex).toBeGreaterThan(-1);
    expect(educationIndex).toBeGreaterThan(-1);
    expect(experienceIndex).toBeLessThan(educationIndex);
  });

  it('renders article padding via document CSS', () => {
    const html = renderResumeHtml(sampleResume, 'classic');
    expect(html).toContain('.resume-article');
    expect(html).toContain('padding: 0.5in');
  });
});

describe('visual templates', () => {
  it.each(VISUAL_TEMPLATES.map((t) => [t.id, t]))(
    '%s renders sample JSON without throwing',
    (id) => {
      const html = assertTemplateIdRenders(id);
      expect(html).toContain(`data-template="${id}"`);
    },
  );

  it('presentation config can reorder sections', () => {
    const config = getDefaultPresentationConfig('classic');
    const reordered = {
      ...config,
      sectionOrder: ['education', 'work', 'skills'] as typeof config.sectionOrder,
    };
    const html = renderResumeHtml(sampleResume, 'classic', { presentationConfig: reordered });
    const educationIndex = html.indexOf('id="education-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(educationIndex).toBeLessThan(experienceIndex);
  });

  it('hidden sections are omitted', () => {
    const config = getDefaultPresentationConfig('classic');
    const hidden = {
      ...config,
      hiddenSections: ['education'],
    };
    const order = visibleSectionOrder(hidden);
    expect(order).not.toContain('education');
    const html = renderResumeHtml(sampleResume, 'classic', { presentationConfig: hidden });
    expect(html).not.toContain('id="education-heading"');
  });

  it('left template places profile image beside header text', () => {
    const resume = {
      ...sampleResume,
      basics: {
        ...sampleResume.basics,
        image: 'https://example.com/photo.jpg',
      },
    };
    const defaults = getDefaultPresentationConfig('left');
    const html = renderResumeHtml(resume, 'left', {
      presentationConfig: {
        ...defaults,
        basicsFields: { ...defaults.basicsFields, image: true },
      },
    });
    expect(html).toContain('flex flex-row items-start gap-4');
    expect(html).toContain('shrink-0 rounded-full object-cover');
    const headerStart = html.indexOf('<header class="border-b border-neutral-400 pb-3 text-left">');
    const headerEnd = html.indexOf('</header>', headerStart);
    const headerHtml = html.slice(headerStart, headerEnd);
    const imageIndex = headerHtml.indexOf('photo.jpg');
    const nameIndex = headerHtml.indexOf('<h1');
    expect(imageIndex).toBeGreaterThan(-1);
    expect(nameIndex).toBeGreaterThan(imageIndex);
  });

  it('legacy capd-masters-skills-first preset places skills before experience', () => {
    const config = getDefaultPresentationConfig('capd-masters-skills-first');
    const html = renderResumeHtml(sampleResume, 'classic', { presentationConfig: config });
    const skillsIndex = html.indexOf('id="skills-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(skillsIndex).toBeLessThan(experienceIndex);
  });

  it('renders languages once without additional info section', () => {
    const resume = {
      ...sampleResume,
      languages: [{ language: 'Spanish', fluency: 'Native' }],
    };
    const html = renderResumeHtml(resume, 'modern');
    expect(html).toContain('id="languages-heading"');
    expect(html).not.toContain('id="additional-info-heading"');
    expect(html).not.toContain('Additional Information');
    expect(html.match(/id="languages-heading"/g)).toHaveLength(1);
  });

  it('strips legacy additionalInfo from saved presentation config', () => {
    const config = mergePresentationConfig(getDefaultPresentationConfig('modern'), {
      sectionOrder: ['summary', 'work', 'languages', 'additionalInfo'] as never,
    });
    expect(config.sectionOrder).not.toContain('additionalInfo');
    const order = visibleSectionOrder(config);
    expect(order).not.toContain('additionalInfo');
    const resume = {
      ...sampleResume,
      languages: [{ language: 'Spanish', fluency: 'Native' }],
    };
    const html = renderResumeHtml(resume, 'modern', { presentationConfig: config });
    expect(html).not.toContain('id="additional-info-heading"');
  });
});
