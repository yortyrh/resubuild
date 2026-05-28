-- Persist selected resume template per CV (default mit-classic).
ALTER TABLE cv
  ADD COLUMN IF NOT EXISTS template_id text NOT NULL DEFAULT 'mit-classic';

COMMENT ON COLUMN cv.template_id IS 'Resume export template id from @resumind/resume-template registry';
