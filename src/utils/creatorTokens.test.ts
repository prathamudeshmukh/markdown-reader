import { describe, it, expect, beforeEach } from 'vitest';
import { saveCreatorToken, loadCreatorToken, clearCreatorToken } from './creatorTokens';

beforeEach(() => localStorage.clear());

describe('creatorTokens', () => {
  it('saves and loads a token for a slug', () => {
    saveCreatorToken('abc1234', 'my-secret-token');
    expect(loadCreatorToken('abc1234')).toBe('my-secret-token');
  });

  it('returns null when no token is stored', () => {
    expect(loadCreatorToken('no-such-slug')).toBeNull();
  });

  it('clears the token for a slug', () => {
    saveCreatorToken('abc1234', 'my-secret-token');
    clearCreatorToken('abc1234');
    expect(loadCreatorToken('abc1234')).toBeNull();
  });

  it('does not affect tokens for other slugs', () => {
    saveCreatorToken('slug-a', 'token-a');
    saveCreatorToken('slug-b', 'token-b');
    clearCreatorToken('slug-a');
    expect(loadCreatorToken('slug-b')).toBe('token-b');
  });

  it('overwrites an existing token', () => {
    saveCreatorToken('abc1234', 'old-token');
    saveCreatorToken('abc1234', 'new-token');
    expect(loadCreatorToken('abc1234')).toBe('new-token');
  });
});
