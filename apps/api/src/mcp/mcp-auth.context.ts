/**
 * # MCP Authentication Context (`mcp-auth.context.ts`)
 *
 * ## Overview
 *
 * This module provides request-scoped user authentication context for the MCP server.
 * It bridges NestJS's request lifecycle with the MCP SDK's callback-based invocation model.
 *
 * ## The Problem
 *
 * The MCP SDK calls tool/resource handlers as plain async functions — not as NestJS route
 * handlers. Consequently, NestJS's dependency injection cannot automatically inject
 * `@Req()`, `@CurrentUser()`, or any other request-scoped context into those callbacks.
 *
 * Meanwhile, every handler MUST know which user is making the request, because all data
 * access is row-level secured (RLS) by `user_id`.
 *
 * ## The Solution: AsyncLocalStorage
 *
 * Node.js's `AsyncLocalStorage` API (also available in modern browsers) allows attaching
 * arbitrary data to the current async execution context — without passing it explicitly
 * through every function signature.
 *
 * It works like a per-request variable bag that lives on the async call chain:
 *
 * ```
 * Request A (user=alice)  ─┐
 *   └─ tool_handler()     ──┼─ McpToolsService ─┬─ CvService ─┬─ DB query (SELECT WHERE user_id='alice')
 *   └─ resource_list()     ──┘                   │             │
 *                                              │             │
 * Request B (user=bob)    ─┐                   │             │
 *   └─ tool_handler()     ──┼─ McpToolsService ─┴─ CvService ─┴─ DB query (SELECT WHERE user_id='bob')
 * ```
 *
 * Each request's `AsyncLocalStorage` slot is independent — even when two requests are
 * in flight simultaneously on the same event loop, `getMcpAuthUser()` returns the
 * correct user for each.
 *
 * ## Why not just use a module-level variable?
 *
 * A shared variable would be overwritten by concurrent requests, causing user A to see
 * user B's data. `AsyncLocalStorage` solves this by giving each async branch its own
 * storage slot.
 *
 * ## Why not pass `user` through every function?
 *
 * You could, but it would require threading `user: AuthUser` through ALL service methods,
 * repository methods, and their call chains — even those that don't need it. This creates
 * a pervasive "auth parameter pollution" problem. `AsyncLocalStorage` achieves the same
 * security guarantee without any signature changes.
 *
 * ## Design Invariants
 *
 * 1. `mcpAuthStorage.run(user, callback)` MUST be called BEFORE any MCP request handling.
 *    The controller wraps the SDK call in `run()` — see `mcp.controller.ts` line ~116.
 *
 * 2. `getMcpAuthUser()` MUST only be called within an active `run()` context.
 *    Calling it outside (e.g., during server startup) throws.
 *
 * 3. The `AuthUser` object contains only the minimal identity needed — it does NOT
 *    contain Supabase tokens or long-lived credentials (those are fetched per-request
 *    via `createClientForUser()`).
 *
 * ## Usage Example
 *
 * ```typescript
 * // Correct — inside a request context
 * const user = getMcpAuthUser(); // returns the authenticated user
 *
 * // Incorrect — outside a request context (throws)
 * getMcpAuthUser(); // throws "MCP auth context is not set"
 * ```
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthUser } from '../auth/auth-user.types';

/**
 * The AsyncLocalStorage instance that holds the current request's authenticated user.
 *
 * This is a module-level singleton — one per Node.js process. Multiple concurrent MCP
 * requests each get their own storage slot managed by `run()`.
 *
 * McpAuthStorage acts as a "context variable" or "thread-local storage" for async code,
 * commonly seen in other languages/frameworks as:
 *  - Go's `context.WithValue()`
 *  - Python's `contextvars.ContextVar`
 *  - Java's `ThreadLocal`
 */
export const mcpAuthStorage = new AsyncLocalStorage<AuthUser>();

/**
 * Retrieve the authenticated user for the current MCP request.
 *
 * This function reads from the `AsyncLocalStorage` slot that was populated by
 * `mcpAuthStorage.run(user, callback)` in the controller. Any code running within
 * that callback chain — tool handlers, service methods, repository calls, etc. — can
 * call this to get the current user without it being passed as an argument.
 *
 * @throws Error - If called outside an active MCP request context (i.e., before
 *                 `mcpAuthStorage.run()` has been entered). This typically happens
 *                 when tool/service code is called outside a request lifecycle.
 *
 * @returns The `AuthUser` for the current request — contains `id`, optional `email`,
 *          and `authMethod` ('jwt' | 'mcp').
 *
 * @example
 * ```typescript
 * // Inside a tool handler (called within mcpAuthStorage.run)
 * const user = getMcpAuthUser();
 * const cvs = await this.cvService.findAll(user);
 * ```
 */
export function getMcpAuthUser(): AuthUser {
  const user = mcpAuthStorage.getStore();
  if (!user) {
    throw new Error(
      'MCP auth context is not set. Ensure this code is called within ' +
        'mcpAuthStorage.run() — i.e., during active MCP request handling.',
    );
  }
  return user;
}
