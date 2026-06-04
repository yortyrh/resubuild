import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { mcpAuthStorage } from './mcp-auth.context';
import { McpAuthRequestBridge } from './mcp-auth-request-bridge.interceptor';

const mockUser = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

function makeContext(url: string | undefined, user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url, user }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(observed: { insideRun?: unknown }): CallHandler {
  return {
    handle: () => {
      observed.insideRun = mcpAuthStorage.getStore();
      return of({ ok: true });
    },
  };
}

describe('McpAuthRequestBridge', () => {
  let interceptor: McpAuthRequestBridge;
  let observed: { insideRun?: unknown };

  beforeEach(() => {
    interceptor = new McpAuthRequestBridge();
    observed = {};
  });

  it('runs the request handler inside mcpAuthStorage.run(req.user, ...) so getMcpAuthUser() reaches the user', async () => {
    const context = makeContext('/mcp', mockUser);
    const handler = makeHandler(observed);

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ ok: true });
    expect(observed.insideRun).toEqual(mockUser);
  });

  it('also wraps requests on /mcp/ (the trailing-slash alias)', async () => {
    const context = makeContext('/mcp/', mockUser);
    const handler = makeHandler(observed);

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ ok: true });
    expect(observed.insideRun).toEqual(mockUser);
  });

  it('passes the handler through unchanged on non-MCP routes (e.g. /settings/mcp)', async () => {
    const context = makeContext('/settings/mcp', mockUser);
    let called = false;
    const handler: CallHandler = {
      handle: () => {
        called = true;
        return of({ passthrough: true });
      },
    };

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(called).toBe(true);
    expect(observed.insideRun).toBeUndefined();
    expect(result).toEqual({ passthrough: true });
  });

  it('passes the handler through unchanged when req.user is undefined', async () => {
    const context = makeContext('/mcp', undefined);
    let called = false;
    const handler: CallHandler = {
      handle: () => {
        called = true;
        return of({ passthrough: true });
      },
    };

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(called).toBe(true);
    expect(result).toEqual({ passthrough: true });
  });

  it('keeps mcpAuthStorage empty outside the run context', () => {
    expect(mcpAuthStorage.getStore()).toBeUndefined();
  });
});
