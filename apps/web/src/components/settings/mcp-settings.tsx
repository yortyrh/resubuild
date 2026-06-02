'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createMcpApiKey,
  getMcpSettings,
  type McpApiKey,
  type McpSettingsResponse,
  patchMcpSettings,
} from '@/lib/api';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface McpSettingsProps {
  backHref?: string;
  backLabel?: string;
}

export function McpSettings({ backHref, backLabel }: McpSettingsProps = {}) {
  const [settings, setSettings] = useState<McpSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMcpSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mcpEndpoint = `${apiUrl.replace(/\/$/, '')}/mcp`;

  const clientConfigSnippet = `{
  "mcpServers": {
    "resumind": {
      "url": "${mcpEndpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}`;

  const toggleEnabled = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const data = await patchMcpSettings({ mcpEnabled: enabled });
      setSettings(data);
      toast.success(enabled ? 'MCP access enabled.' : 'MCP access disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update MCP settings');
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createMcpApiKey();
      setCreatedSecret(result.secret);
      setSettings((prev) =>
        prev ? { ...prev, key: result.key } : { mcpEnabled: false, key: result.key },
      );
      setRotateOpen(false);
      toast.success('Key rotated. Copy the new key — it will not be shown again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading MCP settings…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="text-muted-foreground mb-2 inline-block text-sm hover:underline"
          >
            ← {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold">MCP access</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Connect Cursor, Claude Desktop, or other MCP clients to manage CVs and job applications
          with long-lived API keys.
        </p>
      </div>

      {error ? <p className="text-destructive min-h-[1.25rem] text-sm">{error}</p> : null}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Enable MCP</h2>
            <p className="text-muted-foreground text-sm">
              When disabled, valid API keys cannot call the MCP endpoint.
            </p>
          </div>
          <Button
            type="button"
            variant={settings?.mcpEnabled ? 'secondary' : 'default'}
            disabled={busy}
            onClick={() => void toggleEnabled(!settings?.mcpEnabled)}
          >
            {settings?.mcpEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">API key</h2>
          {settings?.key ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRotateOpen(true)}
              disabled={busy}
            >
              Rotate key
            </Button>
          ) : null}
        </div>
        {settings?.key ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">Your key</p>
              <p className="text-muted-foreground font-mono text-xs">
                {settings.key.keyPrefix}… · created{' '}
                {new Date(settings.key.createdAt).toLocaleDateString()}
                {settings.key.lastUsedAt
                  ? ` · last used ${new Date(settings.key.lastUsedAt).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No key created yet.</p>
        )}
      </div>

      {createdSecret ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Copy your new API key</p>
          <code className="block break-all rounded bg-white/80 p-2 font-mono text-xs">
            {createdSecret}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(createdSecret)}
          >
            Copy to clipboard
          </Button>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Client configuration</h2>
        <p className="text-muted-foreground text-sm">
          Add this to your MCP client config (replace the bearer token with your key).
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{clientConfigSnippet}</pre>
      </div>

      <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate API key?</DialogTitle>
            <DialogDescription>
              Your current key will be immediately invalidated. Clients using it will stop working.
              Create a new key and update your MCP client config.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRotateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRotate()}
              disabled={busy}
            >
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
