## ADDED Requirements

### Requirement: Row Level Security MUST restrict job application tables to the owning user

RLS SHALL be enabled on `public.job_application` and `public.job_application_message` with SELECT, INSERT, UPDATE, and DELETE policies such that only rows where `auth.uid() = user_id` (directly on `job_application`, or via parent application ownership on messages) are visible or mutable.

#### Scenario: Cross-tenant application isolation

- **WHEN** user A's JWT queries `job_application`
- **THEN** only applications with `user_id = auth.uid()` SHALL be visible

#### Scenario: Message access follows application ownership

- **WHEN** user A attempts to read messages for user B's application id
- **THEN** no rows SHALL be returned

### Requirement: Realtime publication SHALL include job_application_message for authorized subscribers

When Supabase Realtime is enabled, `job_application_message` SHALL be published for postgres changes. RLS SHALL ensure subscribers only receive messages for applications they own.

#### Scenario: Realtime insert delivered to owner

- **WHEN** a new message is inserted for an application owned by the subscribed user
- **THEN** Realtime clients authenticated as that user MAY receive the insert event
