## Context

`@mdxeditor/editor` renders its floating surfaces (Block-type select dropdown,
Link dialog, table grid picker, etc.) into a portal that is created on
mount and appended to `document.body` (see `MDXEditor.js:81–89` in the editor
dist). The portal is a `.mdxeditor-popup-container` div, lives outside the
React tree of the editor, and gets its own `position: absolute` stacking
context.

When the editor is mounted inside a Radix dialog (`z-50`), the portal lands
in stacking-context zero on the page — the dialog overlay paints over it and
the user sees the dropdown trigger highlight on click but the dropdown panel
itself is invisible. The Block-type select is the most visible symptom
because it is the first thing the user tries when authoring headings, but the
Link dialog and table grid picker fail the same way.

The original bug report suggested a CSS rule on a descendant selector:

```css
.mdxeditor-theme .mdxeditor-popup-container {
  @apply !z-[200];
}
```

That selector would never match because the popup container is a sibling of
the editor, not a descendant. The fix needs to tag the editor itself with a
stable token, then use a compound selector on the popup container using
that same token.

## Goals / Non-Goals

**Goals:**

- Make every `MDXEditor` floating surface reachable when the editor is
  mounted inside a Radix overlay (cover-letter dialog, future drawers,
  popovers).
- Keep the fix contained to the editor wrapper and the global stylesheet —
  no upstream patches, no new dependencies.
- Pin the fix with a regression test so a future refactor that drops the
  `className` prop fails the suite.

**Non-Goals:**

- Changing `@mdxeditor/editor`'s `overlayContainer` behavior. The library
  exposes a prop that would let us portal into a different parent, but that
  is a wrapper-level concern (the `MarkdownEditor` API does not surface it)
  and would not generalize to the inline-variant editors in CV section
  cards.
- Rewriting the dropdown positioning. The popup positions correctly relative
  to the trigger; the only bug is the z-index ordering.
- Fixing every overlay in the app. The fix is generic — any future
  `MDXEditor` mount inside an overlay inherits the rule automatically.

## Decisions

### 1. Use a stable `mdxeditor-theme` token on the `MDXEditor` `className` prop

`@mdxeditor/editor` copies the `className` prop onto the popup container
div on mount (`MDXEditor.js:86`). We add `className="mdxeditor-theme"` to
the `MDXEditor` element. The token has no styling of its own — it exists
purely as a stable selector hook on the popup container.

**Alternative considered:** pass a custom `overlayContainer` (the editor
prop that controls where the popup is appended) and portal into the dialog
content instead of `document.body`. Rejected because (a) it is a
wrapper-level API change that does not generalize to the inline editor
cases, and (b) it does not solve the case where the dialog content itself
sits inside another overlay.

**Alternative considered:** use the `overlayContainer` prop to portal into
a `position: relative` ancestor. Rejected for the same reason.

### 2. Use a compound selector on the popup container, not a descendant selector

The popup container is a sibling of the editor under `document.body`, so a
descendant selector (`.mdxeditor-theme .mdxeditor-popup-container`) would
never match. The CSS uses a compound selector
(`.mdxeditor-popup-container.mdxeditor-theme`) so both the editor and the
portal share the token but the z-index rule only applies to the portal.

The bug report's suggested selector is preserved in the comment block above
the rule so the next reader sees why we are not using it.

### 3. `z-index: 200` (not a Tailwind `@apply`)

The fix is in `apps/web/src/app/globals.css`, which uses raw CSS — there is
no Tailwind processing pass in this file's block (the project uses
Tailwind v4 utility-first elsewhere, but the editor stylesheet predates the
utility-first pass and uses raw CSS for selector specificity and
`!important` overrides that match MDXEditor's own hashed class names).
`!important` is required because MDXEditor's CSS modules set
`z-index: 50` on the popup container.

### 4. Pin the prop in the existing unit test

`markdown-editor-impl.test.tsx` mocks `MDXEditor` already; we extend the
mock to capture `className` (via a `data-class-name` attribute) and add
one test that asserts the `mdxeditor-theme` token is forwarded. A future
refactor that drops the prop — or that drops it conditionally on `freeForm`
— fails this test.

## Risks / Trade-offs

- **Any new overlay stacked higher than `z-200` will obscure the popup.**
  Mitigation: 200 is a comfortable margin above Radix's default `z-50`;
  if a future overlay needs more, bump the value or use CSS variables.
- **The token leaks into every `MDXEditor` instance, including the inline
  variant.** Mitigation: the inline variant does not host popovers that
  need to escape overlays, so the rule is a no-op for it. The token
  presence on the root div is harmless.
- **Forgetting the popup is appended to `document.body`.** The compound
  selector and the comment block document this; the regression test
  guards against dropping the `className` prop.

## Migration Plan

None. The fix is a wrapper-level CSS change that ships in a normal release
and has no schema, API, or storage implications. Rollback is `git revert`
on the two commit artifacts (impl + globals).
