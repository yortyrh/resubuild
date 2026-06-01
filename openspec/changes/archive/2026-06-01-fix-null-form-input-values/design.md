## Context

The normalized resume schema (`packages/types`) types many optional string fields as `string | null`. Section editors pass API values directly into controlled form components. React 19 warns and errors when `value={null}` is passed to native inputs. Default parameter `value = ''` does not apply when callers explicitly pass `null`.

## Goals / Non-Goals

**Goals:**

- Eliminate React controlled-input warnings for null optional CV fields.
- Prevent combobox helpers from throwing on `null.trim()`.
- Centralize null coercion in shared `Input` / `Textarea` primitives.
- Document and test null-safe behavior at field boundaries.

**Non-Goals:**

- Changing API or database null semantics.
- Migrating all resume types to exclude `null`.
- Altering save payloads (empty string vs null persistence rules unchanged).

## Decisions

### 1. Coerce at the primitive layer

**Choice:** Destructure `value` in `Input` and `Textarea`; when `value !== undefined`, pass `value ?? ''` to the DOM.

**Rationale:** One fix covers every direct primitive usage; preserves uncontrolled mode when `value` is omitted.

### 2. Coerce at CV field wrappers

**Choice:** Each CV-specific field (`TextField`, `IsoDateField`, comboboxes) uses `const safeValue = value ?? ''` before trim, parse, or child props.

**Rationale:** Defensive at data boundaries; explicit `string | null` props document the normalized type contract.

### 3. Colocated Vitest regression guards

**Choice:** Tests beside `input.tsx`, `textarea.tsx`, and extended existing field test files assert empty display for `value={null}`.

**Rationale:** Prevents reintroduction of the React warning without E2E overhead.

## Risks / Trade-offs

- **Double coercion** (field + primitive) is redundant but harmless and improves locality of fixes.
- **Uncontrolled inputs** remain supported when `value` is `undefined`; tests verify `defaultValue` still works.
