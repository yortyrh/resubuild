## 1. Shared basics form fields

- [x] 1.1 Extract `BasicsFormFields` in `apps/web/src/components/cv/basics-form-fields.tsx` with controlled `value` / `onChange` for all Basics edit fields (name, label, summary, email, phone, url, location, address, profile photo upload + URL)
- [x] 1.2 Refactor `ManagedBasicsSection` edit branch in `apps/web/src/components/cv/managed-basics-section.tsx` to render `BasicsFormFields` instead of inline field definitions

## 2. Simplified create CV page

- [x] 2.1 Add `CreateCvForm` in `apps/web/src/components/cv/create-cv-form.tsx` with local state for title and basics, Save and Cancel actions, and profile photo upload via `uploadResumeMedia`
- [x] 2.2 Rewrite `apps/web/src/app/dashboard/cv/new/new-cv-page-client.tsx` to render `CreateCvForm` (remove auto-create `useEffect`); on Save call `createCv({ title, data: { ...createEmptyResume(), basics } })` then `router.replace` to `/dashboard/cv/:id`
- [x] 2.3 Update copy in `apps/web/src/app/dashboard/cv/new/page.tsx` to describe the form-first create flow

## 3. Tests and verification

- [x] 3.1 Add `create-cv-form.test.tsx` beside `create-cv-form.tsx`: assert no API call on mount, Save invokes `createCv` with title and basics payload, success navigates to editor route
- [x] 3.2 Add or update `new-cv-page-client.test.tsx` to confirm the page no longer auto-creates on load
- [x] 3.3 Manual QA: cancel/back creates no row; Save with partial basics creates CV and opens full editor; photo upload before Save persists `basics.image` on create
