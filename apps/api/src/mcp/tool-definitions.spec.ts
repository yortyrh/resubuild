import { MCP_TOOL_DEFINITIONS, MCP_TOOL_NAMES } from './tool-definitions';

const FORBIDDEN_TOOL_NAMES = [
  'update_cv',
  'configure_ai_agent',
  'import_pdf',
  'web_search',
  'scrape_url',
  'prepare_application',
] as const;

describe('tool-definitions', () => {
  it('defines every catalog tool with a long description', () => {
    for (const name of MCP_TOOL_NAMES) {
      const def = MCP_TOOL_DEFINITIONS[name];
      expect(def.description.length).toBeGreaterThanOrEqual(80);
    }
  });

  it('does not include forbidden agent/search/import tool names', () => {
    for (const forbidden of FORBIDDEN_TOOL_NAMES) {
      expect(MCP_TOOL_NAMES).not.toContain(forbidden);
    }
    expect(MCP_TOOL_NAMES.some((name) => name.includes('ai_agent'))).toBe(false);
    expect(MCP_TOOL_NAMES.some((name) => name.endsWith('_search'))).toBe(false);
  });
});
