/** Stops the containers started by global-setup.ts. */
export default async function globalTeardown() {
  await globalThis.__E2E_STOP_INFRA__?.();
}
