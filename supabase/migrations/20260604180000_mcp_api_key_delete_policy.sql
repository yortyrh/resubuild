-- Allow users to delete their own MCP API keys so the rotate flow can replace
-- the previous row. Without this policy the user-scoped DELETE is silently
-- rejected by RLS and the subsequent INSERT collides with the
-- mcp_api_key_user_id_unique constraint.
create policy "Users can delete own mcp_api_key"
  on public.mcp_api_key for delete
  using (auth.uid() = user_id);
