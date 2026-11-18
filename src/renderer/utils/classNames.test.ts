import { describe, expect, it } from 'vitest';
import { cx } from './classNames';

describe('cx', () => {
  it('joins the class names that are set', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
    expect(cx(false)).toBe('');
  });
});
