import { BadRequestException, NotFoundException } from '@nestjs/common';
import { toHttpException } from './database-exception.filter';

describe('toHttpException', () => {
  it('maps malformed input (22P02) to 400', () => {
    const error = Object.assign(new Error('Failed query'), {
      cause: { code: '22P02', message: 'invalid input syntax for type uuid: "x"' },
    });
    const mapped = toHttpException(error);
    expect(mapped).toBeInstanceOf(BadRequestException);
    expect(mapped?.message).toBe('invalid input syntax for type uuid: "x"');
  });

  it('maps constraint violations (23505) to 400', () => {
    expect(toHttpException({ code: '23505', message: 'duplicate key' })).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('ignores server-side errors such as connection failures', () => {
    expect(toHttpException({ code: '08006', message: 'connection failure' })).toBeNull();
    expect(toHttpException(new Error('boom'))).toBeNull();
  });

  it('leaves HTTP exceptions untouched', () => {
    expect(toHttpException(new NotFoundException())).toBeNull();
  });
});
