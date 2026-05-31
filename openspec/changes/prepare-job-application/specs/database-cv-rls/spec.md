## ADDED Requirements

### Requirement: Row Level Security MUST restrict job application tables to the owning user

RLS SHALL be enabled on `public.job_application` with SELECT, INSERT, UPDATE, and DELETE policies such that only rows where `auth.uid() = user_id` are visible or mutable.

#### Scenario: Cross-tenant application isolation

- **WHEN** user A's JWT queries `job_application`
- **THEN** only applications with `user_id = auth.uid()` SHALL be visible
