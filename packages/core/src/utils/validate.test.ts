import { describe, expect, it } from 'bun:test';
import { ValidationError } from './validate.js';

describe('ValidationError', () => {
  it('has name ValidationError', () => {
    const err = new ValidationError('bad');
    expect(err.name).toBe('ValidationError');
  });
  it('is an Error instance', () => {
    expect(new ValidationError('bad')).toBeInstanceOf(Error);
  });
  it('stores cause', () => {
    const cause = new Error('original');
    const err = new ValidationError('bad', cause);
    expect(err.cause).toBe(cause);
  });
  it('has correct message', () => {
    expect(new ValidationError('test message').message).toBe('test message');
  });
});
