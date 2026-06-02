export interface McpApiKey {
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface McpSettingsResponse {
  mcpEnabled: boolean;
  key: McpApiKey | null;
}

export interface McpCreateKeyResponse {
  key: McpApiKey;
  secret: string;
}

export interface McpPatchSettingsBody {
  mcpEnabled?: boolean;
}

export type McpCreateKeyBody = {};
