import { ValidationPipe } from '@nestjs/common';
import { BETTER_AUTH } from './auth/better-auth';
import { configureApp, parseTrustProxy } from './configure-app';

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
      set: jest.fn(),
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

  it('allows the guest import headers in CORS', () => {
    const { app } = fakeApp();
    configureApp(app as never);
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedHeaders: expect.arrayContaining(['cf-turnstile-response', 'x-guest-import-token']),
      }),
    );
  });

  it('trusts the proxy only when TRUST_PROXY is set', () => {
    const original = process.env.TRUST_PROXY;
    try {
      delete process.env.TRUST_PROXY;
      const plain = fakeApp();
      configureApp(plain.app as never);
      expect(plain.app.set).not.toHaveBeenCalled();

      process.env.TRUST_PROXY = '1';
      const proxied = fakeApp();
      configureApp(proxied.app as never);
      expect(proxied.app.set).toHaveBeenCalledWith('trust proxy', 1);
    } finally {
      if (original === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = original;
    }
  });
});

describe('parseTrustProxy', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['true', true],
    ['false', false],
    ['2', 2],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('parses %p', (raw, expected) => {
    expect(parseTrustProxy(raw)).toEqual(expected);
  });
});
