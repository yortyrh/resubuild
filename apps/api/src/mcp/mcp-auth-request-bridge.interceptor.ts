import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  type Request,
} from '@nestjs/common';
import { from, Observable } from 'rxjs';
import { mcpAuthStorage } from './mcp-auth.context';

/**
 * # McpAuthRequestBridge (`mcp-auth-request-bridge.interceptor.ts`)
 *
 * Bridges the authenticated user from the underlying Express request to the
 * `mcpAuthStorage` `AsyncLocalStorage` slot so `@Tool` and `@Resource` handlers
 * — invoked by the `@rekog/mcp-nest` wrapper as plain Nest-injected methods —
 * can call `getMcpAuthUser()` without taking the `AuthUser` as a parameter.
 *
 * ## Why a route-scoped interceptor
 *
 * Prior implementation wrapped each request in `mcpAuthStorage.run(...)` from
 * `McpController.handleMcp()`. After adopting `@rekog/mcp-nest`, the wrapper
 * brings its own controller mounted at `/mcp` and `/mcp/`. We register this
 * interceptor as a global `APP_INTERCEPTOR` (in `McpModule.providers`) and
 * have it short-circuit non-MCP routes by checking the request path. This
 * keeps the wrap fires only on MCP traffic (never on `GET /settings/mcp` or
 * any other REST endpoint) without requiring changes to the wrapper's
 * controller.
 *
 * ## Pass-through when no user is set
 *
 * If `req.user` is `undefined` (e.g. the guard has not run yet because the
 * request reached the interceptor before the route handler), the interceptor
 * runs the handler unchanged. `getMcpAuthUser()` will then throw if called —
 * matching the existing "throws outside a `run` context" contract in
 * `mcp-auth.context.spec.ts`.
 */
@Injectable()
export class McpAuthRequestBridge implements NestInterceptor {
  /**
   * Returns true when the request path belongs to the MCP transport
   * (`/mcp` or `/mcp/`). Used to short-circuit non-MCP routes so the
   * `AsyncLocalStorage` wrap never runs for REST endpoints like
   * `GET /settings/mcp`.
   */
  private isMcpPath(req: Request): boolean {
    const url = req?.url ?? '';
    return url === '/mcp' || url === '/mcp/' || url.startsWith('/mcp?') || url.startsWith('/mcp/?');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();

    if (!this.isMcpPath(req) || !req?.user) {
      return next.handle();
    }

    return from(
      mcpAuthStorage.run(req.user as never, async () => {
        const result = await next.handle().toPromise();
        return result;
      }),
    );
  }
}
