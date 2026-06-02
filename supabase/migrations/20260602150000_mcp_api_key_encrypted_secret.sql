-- Add encrypted_secret column to support copying full API key
-- Existing keys created before this column will not have a secret available for copy.
alter table public.mcp_api_key add column encrypted_secret text;