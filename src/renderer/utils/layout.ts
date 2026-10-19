// The app's fixed widths, in one place for the resize math and the CSS. The
// shell sets them as CSS variables (layoutVariables), so stylesheets read
// the same numbers as the code.
import type { CSSProperties } from 'react';

export const RAIL_WIDTH = 56;
export const PANE_WIDTH = 440;
export const SIDER_MIN_WIDTH = 180;
export const SIDER_MAX_WIDTH = 600;
// The sider never squeezes the table below this, even with the pane open.
export const MIN_TABLE_WIDTH = 360;

// Below this width the detail pane becomes a drawer.
export const NARROW_QUERY = '(max-width: 1099px)';

export const layoutVariables = {
  '--rail-width': `${RAIL_WIDTH}px`,
  '--pane-width': `${PANE_WIDTH}px`
} as CSSProperties;

// The widest the sider can be: what's left of the window after the rail,
// the docked pane (unless it's a drawer) and the table's minimum width.
export const siderMaxWidth = (windowWidth: number, narrow: boolean) =>
  Math.max(
    SIDER_MIN_WIDTH,
    Math.min(
      SIDER_MAX_WIDTH,
      windowWidth - RAIL_WIDTH - (narrow ? 0 : PANE_WIDTH) - MIN_TABLE_WIDTH
    )
  );
