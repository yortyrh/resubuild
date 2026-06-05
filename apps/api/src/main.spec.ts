/**
 * Bootstrap options test for `main.ts`.
 *
 * Verifies that `NestFactory.create` is called with `{ snapshot: true }`,
 * which is required by @nestjs/devtools-integration to record the bootstrap
 * graph for Devtools to render.
 *
 * We spy on `NestFactory.create` before importing `bootstrap` so the spy
 * catches the call made during the async bootstrap sequence.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

jest.mock('@nestjs/core', () => {
  const actual = jest.requireActual('@nestjs/core');
  return {
    ...actual,
    NestFactory: {
      ...actual.NestFactory,
      create: jest.fn().mockResolvedValue({
        enableCors: jest.fn(),
        useGlobalPipes: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

describe('bootstrap', () => {
  afterAll(() => {
    jest.unmock('@nestjs/core');
  });

  it('calls NestFactory.create with { snapshot: true }', async () => {
    // Dynamically import to trigger bootstrap before assertions
    await import('./main');

    // Allow one event-loop tick for the async bootstrap to start
    await new Promise((resolve) => setImmediate(resolve));

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule, { snapshot: true });
  });
});
