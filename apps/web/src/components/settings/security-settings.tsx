'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangePassword } from '@/lib/queries/auth-mutations';
import { useAuthMe, useAuthSession } from '@/lib/queries/auth-queries';

interface SecuritySettingsProps {
  backHref?: string;
  backLabel?: string;
}

export function SecuritySettings({ backHref, backLabel }: SecuritySettingsProps = {}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: session } = useAuthSession();
  const { data: me } = useAuthMe({ enabled: Boolean(session?.userId) });
  const hasPassword = me?.has_password ?? true;

  const changePassword = useChangePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return; // mutation error will handle
    }
    changePassword.mutate(
      {
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      },
    );
  };

  const error =
    newPassword !== confirmPassword
      ? 'New passwords do not match'
      : (changePassword.error?.message ?? null);

  return (
    <div className="mx-auto max-w-md space-y-6">
      {backHref ? (
        <a
          href={backHref}
          className="text-muted-foreground mb-2 inline-block text-sm hover:underline"
        >
          ← {backLabel ?? 'Back'}
        </a>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold">
          {hasPassword ? 'Change password' : 'Set a password'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {hasPassword
            ? 'Update your account password. Minimum 8 characters.'
            : 'Add a password to your account so you can sign in with your email. Minimum 8 characters.'}
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="surface-soft space-y-4 p-4">
        {hasPassword ? (
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              minLength={1}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full" disabled={changePassword.isPending}>
          {changePassword.isPending
            ? hasPassword
              ? 'Updating…'
              : 'Setting…'
            : hasPassword
              ? 'Update password'
              : 'Set password'}
        </Button>
      </form>
    </div>
  );
}
