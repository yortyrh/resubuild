import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  isValidTemplateId,
  listTemplates,
  TEMPLATE_IDS,
} from './registry';
import { renderResumeHtml } from './render-resume-html';
import { assertTemplateRenders, sampleResume } from './templates/capd-factory';
import { ALL_CAPD_TEMPLATES } from './templates/capd-templates';

describe('template registry', () => {
  it('lists at least 15 templates including mit-classic and all CAPD layouts', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(15);
    expect(TEMPLATE_IDS).toContain(DEFAULT_TEMPLATE_ID);
    for (const capd of ALL_CAPD_TEMPLATES) {
      expect(TEMPLATE_IDS).toContain(capd.id);
    }
  });

  it('returns undefined for unknown template id', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
    expect(isValidTemplateId('nonexistent')).toBe(false);
  });

  it('falls back to mit-classic for unknown id when rendering', () => {
    const html = renderResumeHtml(sampleResume, 'does-not-exist');
    expect(html).toContain('id="experience-heading"');
    expect(html).toContain('Jane Doe');
  });

  it('mit-classic smoke render orders experience before education', () => {
    const html = renderResumeHtml(sampleResume, DEFAULT_TEMPLATE_ID);
    const experienceIndex = html.indexOf('id="experience-heading"');
    const educationIndex = html.indexOf('id="education-heading"');
    expect(experienceIndex).toBeGreaterThan(-1);
    expect(educationIndex).toBeGreaterThan(-1);
    expect(experienceIndex).toBeLessThan(educationIndex);
  });
});

describe('CAPD templates', () => {
  it.each(ALL_CAPD_TEMPLATES.map((t) => [t.id, t]))(
    '%s renders sample JSON without throwing',
    (_id, template) => {
      const html = assertTemplateRenders(template);
      expect(html).toContain(`data-template="${template.id}"`);
    },
  );

  it('capd-first-year-leadership includes leadership heading', () => {
    const resume = {
      ...sampleResume,
      volunteer: [
        {
          organization: 'Student Gov',
          position: 'President',
          startDate: '2019-09',
          endDate: '2020-05',
        },
      ],
    };
    const html = renderResumeHtml(resume, 'capd-first-year-leadership');
    expect(html).toContain('id="leadership-heading"');
    expect(html).toContain('LEADERSHIP EXPERIENCES');
  });

  it('capd-undergraduate-standard places education before experience', () => {
    const html = renderResumeHtml(sampleResume, 'capd-undergraduate-standard');
    const educationIndex = html.indexOf('id="education-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(educationIndex).toBeLessThan(experienceIndex);
  });

  it('capd-undergraduate-mixed places experience before education', () => {
    const html = renderResumeHtml(sampleResume, 'capd-undergraduate-mixed');
    const educationIndex = html.indexOf('id="education-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(experienceIndex).toBeLessThan(educationIndex);
  });

  it('capd-alum places experience before education and includes summary', () => {
    const html = renderResumeHtml(sampleResume, 'capd-alum');
    const educationIndex = html.indexOf('id="education-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(experienceIndex).toBeLessThan(educationIndex);
    expect(html).toContain('id="summary-heading"');
  });

  it('capd-masters-skills-first places skills before experience', () => {
    const html = renderResumeHtml(sampleResume, 'capd-masters-skills-first');
    const skillsIndex = html.indexOf('id="skills-heading"');
    const experienceIndex = html.indexOf('id="experience-heading"');
    expect(skillsIndex).toBeLessThan(experienceIndex);
    expect(html).toContain('RELEVANT SKILLS');
  });
});
