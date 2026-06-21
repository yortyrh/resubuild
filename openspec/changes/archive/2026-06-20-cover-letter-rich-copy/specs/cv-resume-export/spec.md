## MODIFIED Requirements

### Requirement: Markdown-authored resume fields SHALL render as formatted HTML in export output

Fields stored as Markdown in the database (including basics summary, section summaries and descriptions, highlight bullets, reference text, and the cover-letter body) SHALL be converted to sanitized HTML before insertion into the export template. The shared Markdown-to-HTML helper SHALL run the source through `marked` and `sanitize-html` with an allowlist that includes paragraph, line-break, emphasis, list, link, code, and **heading (`h1`–`h6`)** tags. The sanitizer SHALL NOT permit inline `style`, `class`, or event-handler attributes on heading elements, so the only structural HTML that reaches the export pipeline is the semantic tags themselves. The export output MUST NOT display raw Markdown syntax (e.g. literal `**` or `- ` list markers) when the stored value contains Markdown formatting. The letter export HTML template (built by `renderLetterHtml`) SHALL additionally apply letter-specific heading typography (`h1`–`h6` font-size, weight, and margin) inside its inline `<style>` block, so headings in rendered letter HTML and letter PDF render with deliberate spacing rather than relying on the consuming browser's user-agent stylesheet.

#### Scenario: Bold highlight in work section

- **WHEN** a work highlight contains `**Reduced latency by 40%**`
- **THEN** the export HTML for that bullet SHALL render bold emphasis without literal asterisks

#### Scenario: Unsafe HTML in Markdown is stripped

- **WHEN** a summary contains a Markdown link or inline HTML script attempt
- **THEN** the sanitized output SHALL NOT include executable script content

#### Scenario: Markdown heading is preserved as `<h1>`–`<h6>` in sanitized output

- **WHEN** a Markdown field (e.g. cover-letter body) contains a heading line (`# Title`, `## Subheading`, etc.)
- **THEN** the sanitized HTML output SHALL contain the corresponding `<h1>`–`<h6>` element wrapping the heading text
- **AND** SHALL NOT include literal `#` characters as plain text
- **AND** SHALL NOT include any `style`, `class`, or event-handler attributes on the heading element

#### Scenario: Letter export HTML applies heading typography

- **WHEN** the cover-letter Markdown contains a heading
- **THEN** the letter HTML produced by `renderLetterHtml` SHALL include a `<style>` rule that sets `font-size`, `font-weight`, and `margin` for the corresponding heading tag
- **AND** the resulting PDF rendered from that HTML SHALL reflect the heading typography
