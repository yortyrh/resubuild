import { ValidationPipe } from '@nestjs/common';
import { BETTER_AUTH } from './auth/better-auth';
import { configureApp } from './configure-app';

describe('configureApp', () => {
  const originalCors = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalCors;
  });

  function fakeApp() {
    const order: string[] = [];
    const express = { all: jest.fn(() => order.push('auth-handler')) };
    const app = {
      get: jest.fn((token: unknown) => (token === BETTER_AUTH ? { handler: jest.fn() } : null)),
      getHttpAdapter: () => ({ getInstance: () => express }),
      useBodyParser: jest.fn((type: string) => order.push(`body:${type}`)),
      enableCors: jest.fn(() => order.push('cors')),
      useGlobalPipes: jest.fn(() => order.push('pipes')),
    };
    return { app, express, order };
  }

  it('wires CORS, then the Better Auth handler, then body parsers and validation', () => {
    process.env.CORS_ORIGIN = 'http://a.test, http://b.test';
    const { app, express, order } = fakeApp();

    configureApp(app as never);

    expect(order).toEqual(['cors', 'auth-handler', 'body:json', 'body:urlencoded', 'pipes']);
    expect(express.all).toHaveBeenCalledWith('/api/auth/*splat', expect.any(Function));
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['http://a.test', 'http://b.test'],
        exposedHeaders: expect.arrayContaining(['set-auth-token']),
      }),
    );
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
  });

  it('defaults CORS to the local web origin', () => {
    delete process.env.CORS_ORIGIN;
    const { app } = fakeApp();
    configureApp(app as never);
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: ['http://localhost:3000'] }),
    );
  });
});
