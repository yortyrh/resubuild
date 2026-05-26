## Context

`LoginForm` and `RegisterForm` are `'use client'` modules that render the full auth card—including headings and Next.js `<Link>` cross-links (`Register` / `Sign in`). Next.js still server-renders client components, then React hydrates the same subtree in the browser. Any DOM mutation between SSR HTML and hydration causes a mismatch.

Observed dev-server console output (forwarded as `[browser]`):

```
LoginPage → LoginForm → LinkComponent href="/register"
  <a className="text-primary …" href="/register"
-   data-cursor-ref="e3"
  >
+   Register
```

The `data-cursor-ref` attribute is injected by **Cursor IDE embedded browser / MCP browser tooling** to tag elements for automation. It is not emitted by application code (confirmed: no matches in the repo). React therefore sees server HTML that differs from the client virtual DOM at hydration time.

Even when the immediate trigger is environmental, keeping static `<Link>` elements inside a broad client boundary is unnecessary and increases hydration surface area for auth pages that are otherwise mostly static.

## Goals / Non-Goals

**Goals:**

- Eliminate avoidable client hydration for static auth navigation links.
- Provide clear reproduction and verification steps for developers and CI.
- Keep login/register UX, copy, and routing unchanged.

**Non-Goals:**

- Preventing third-party DOM mutation (browser extensions, IDE browsers) globally—only reduce app-owned hydration risk.
- Rewriting auth session logic (`hasSession` redirect in `useEffect` is correct and not part of the mismatch).
- Adding `suppressHydrationWarning` as a blanket fix.

## How to Reproduce

### A. Trigger the reported warning (Cursor / instrumented browser)

1. From repo root, start the stack: `pnpm dev` (web on `:3000`, API on `:3001`).
2. Open **`http://localhost:3000/login`** in the **Cursor Simple Browser** or via Cursor MCP browser navigation (any context that injects `data-cursor-ref` on anchors).
3. Open DevTools → Console (or watch the terminal where `pnpm dev` runs—Next.js forwards `[browser]` logs).
4. **Expected before fix:** React hydration mismatch warning referencing `LoginForm` → `LinkComponent` → `href="/register"` with a `- data-cursor-ref="…"` line in the diff.
5. Optional: visit `/register` and confirm the reciprocal **Sign in** link shows the same class of warning.

### B. Baseline in a standard browser (control)

1. With `pnpm dev` running, open **`http://localhost:3000/login`** in Chrome or Firefox **without** Cursor embedded browser and with extensions disabled (or incognito).
2. Hard refresh the page.
3. **Expected after fix:** No React hydration mismatch in the console.
4. **Note before fix:** May already be clean in a standard browser; the warning is most reliably reproduced under Cursor's instrumented browser.

### C. Regression check after implementation

1. Repeat steps A and B.
2. Step A may still warn if Cursor mutates **server-rendered** anchors outside client boundaries—document outcome in PR notes.
3. Step B MUST remain clean.
4. Run `pnpm --filter web test -- --run` for new unit tests.

## Decisions

### 1. Move static auth chrome to Server Component pages

**Decision:** `login/page.tsx` and `register/page.tsx` render card header, footer cross-link, and layout. `LoginForm` / `RegisterForm` export only the `<form>` element and its fields/buttons/error state.

**Rationale:** Server-rendered `<Link>` nodes are not part of a client hydration subtree, avoiding mismatch on those anchors when the client form hydrates.

**Alternatives considered:**

- _Leave as-is and document as Cursor-only noise_ — does not reduce hydration surface; warning persists during normal Cursor dev workflow.
- _Dynamic import LoginForm with `ssr: false`_ — removes SSR for the entire form; worse UX and SEO for minimal gain.
- _`suppressHydrationWarning` on the link_ — masks symptoms; discouraged by React docs.

### 2. Shared `AuthCrossLink` server helper

**Decision:** Add a small server-safe component (no `'use client'`) encapsulating the muted footer copy + styled `Link`, parameterized by `variant: 'login' | 'register'`.

**Rationale:** DRY between login/register pages; single place for cross-link markup and future copy tweaks.

### 3. Keep session redirect in client form `useEffect`

**Decision:** Do not move `hasSession()` redirect to middleware or server layout in this change.

**Rationale:** Out of scope; `useEffect` runs post-hydration and is not the source of the reported mismatch.

## Risks / Trade-offs

- **[Cursor browser may still warn on server-only links]** → Acceptable; primary fix is architectural. Document in reproduction notes if instrumentation touches non-hydrating nodes.
- **[Card split increases page.tsx markup]** → Mitigated by shared `AuthCrossLink`; forms stay focused.
