import type { AuthUser } from '../auth/auth-user.types';
import { getMcpAuthUser, mcpAuthStorage } from './mcp-auth.context';

const mockUser = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('mcp-auth.context', () => {
  describe('getMcpAuthUser', () => {
    it('returns the user when inside mcpAuthStorage.run()', () => {
      let capturedUser: AuthUser | undefined;

      mcpAuthStorage.run(mockUser, () => {
        capturedUser = getMcpAuthUser();
      });

      expect(capturedUser).toEqual(mockUser);
    });

    it('throws Error when called outside of mcpAuthStorage.run()', () => {
      expect(() => getMcpAuthUser()).toThrow(
        'MCP auth context is not set. Ensure this code is called within mcpAuthStorage.run()',
      );
    });

    it('throws even when AsyncLocalStorage has no store', () => {
      // Deliberately call outside run() context
      expect(() => getMcpAuthUser()).toThrow();
    });

    it('returns correct user when multiple concurrent contexts', () => {
      const user1 = { id: 'user-1', accessToken: 'tok1', authMethod: 'jwt' as const };
      const user2 = { id: 'user-2', accessToken: 'tok2', authMethod: 'jwt' as const };

      let user1Captured: AuthUser | undefined;
      let user2Captured: AuthUser | undefined;

      // Nest two run() calls
      mcpAuthStorage.run(user1, () => {
        user1Captured = getMcpAuthUser();

        mcpAuthStorage.run(user2, () => {
          user2Captured = getMcpAuthUser();
        });

        // After inner run() exits, outer user should still be available
        user1Captured = getMcpAuthUser();
      });

      expect(user1Captured).toEqual(user1);
      expect(user2Captured).toEqual(user2);
    });
  });

  describe('mcpAuthStorage', () => {
    it('run() executes callback with user in store', () => {
      const result = mcpAuthStorage.run(mockUser, () => {
        return getMcpAuthUser();
      });

      expect(result).toEqual(mockUser);
    });

    it('run() returns value returned by callback', () => {
      const result = mcpAuthStorage.run(mockUser, () => {
        return 'computed-value';
      });

      expect(result).toBe('computed-value');
    });

    it('run() propagates errors from callback', () => {
      expect(() =>
        mcpAuthStorage.run(mockUser, () => {
          throw new Error('Callback error');
        }),
      ).toThrow('Callback error');
    });

    it('store is isolated per execution context', () => {
      const results: AuthUser[] = [];

      // Simulate two sequential contexts
      mcpAuthStorage.run(mockUser, () => {
        results.push(getMcpAuthUser());
      });

      const otherUser = { id: 'other-user', accessToken: 'tok2', authMethod: 'jwt' as const };
      mcpAuthStorage.run(otherUser, () => {
        results.push(getMcpAuthUser());
      });

      expect(results).toEqual([mockUser, otherUser]);
    });
  });
});
