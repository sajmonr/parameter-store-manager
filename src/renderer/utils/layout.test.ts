import { describe, expect, it } from 'vitest';
import {
  MIN_TABLE_WIDTH,
  PANE_WIDTH,
  RAIL_WIDTH,
  SIDER_MIN_WIDTH,
  siderMaxWidth
} from './layout';

describe('siderMaxWidth', () => {
  it('leaves room for the rail and the table next to the pane', () => {
    expect(siderMaxWidth(1280, false)).toBe(424);
    expect(siderMaxWidth(1100, false)).toBe(244);
  });

  it('ignores the pane when it is a drawer, up to 600px', () => {
    expect(siderMaxWidth(1100, true)).toBe(600);
    expect(siderMaxWidth(900, true)).toBe(484);
  });

  it('never goes below the minimum width', () => {
    expect(siderMaxWidth(900, false)).toBe(SIDER_MIN_WIDTH);
  });

  it('keeps the table at its minimum width when the sider is at its widest', () => {
    [1100, 1280, 1600].forEach(window => {
      const table =
        window - RAIL_WIDTH - PANE_WIDTH - siderMaxWidth(window, false);
      expect(table).toBeGreaterThanOrEqual(MIN_TABLE_WIDTH);
    });
    // The narrowest window: no docked pane.
    expect(900 - RAIL_WIDTH - siderMaxWidth(900, true)).toBe(MIN_TABLE_WIDTH);
  });
});
