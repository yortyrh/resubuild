export interface McpApiKeySummary {
  id: string;
  label: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface McpSettingsResponse {
  mcpEnabled: boolean;
  keys: McpApiKeySummary[];
}

export interface McpCreateKeyResponse {
  key: McpApiKeySummary;
  secret: string;
}

export interface McpPatchSettingsBody {
  mcpEnabled?: boolean;
}

export interface McpCreateKeyBody {
  label?: string | null;
}
