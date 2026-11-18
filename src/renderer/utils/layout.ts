// The app's fixed sizes, in one place for the resize math and the CSS. The
// shell sets the ones stylesheets need as CSS variables (layoutVariables),
// so they read the same numbers as the code.
import type { CSSProperties } from 'react';
import { NARROW_WIDTH } from '../../shared/layout';

export const RAIL_WIDTH = 56;
export const HEADER_HEIGHT = 52;

// The folder tree. Its width is remembered under SIDER_WIDTH_STORAGE_KEY
// once the user resizes it; until then the default follows the window.
export const SIDER_MIN_WIDTH = 180;
export const SIDER_MAX_WIDTH = 600;
export const SIDER_DEFAULT_WIDTH = 240;
export const SIDER_NARROW_DEFAULT_WIDTH = 220;
export const SIDER_WIDTH_STORAGE_KEY = 'siderWidth';

// The detail pane, docked in a wide window and a drawer in a narrow one.
// The drawer is a little narrower, as it covers the table.
export const PANE_WIDTH = 440;
export const DRAWER_WIDTH = 420;

// The sider never squeezes the table below this, even with the pane open.
export const MIN_TABLE_WIDTH = 360;

// The parameter table's fixed columns and header row; the rest scrolls.
export const TABLE_HEADER_HEIGHT = 39;
export const TABLE_LOCK_COLUMN_WIDTH = 40;
export const TABLE_CHECKBOX_COLUMN_WIDTH = 28;

// The compare grid: a key column, then one per environment.
export const COMPARE_KEY_COLUMN_WIDTH = 300;
export const COMPARE_MIN_ENV_COLUMN_WIDTH = 200;

// The Settings page: the section menu, and the section's readable width.
// The services grid has a column per environment, so it gets more.
export const SETTINGS_NAV_WIDTH = 232;
export const SETTINGS_MAX_WIDTH = 680;
export const SETTINGS_WIDE_MAX_WIDTH = 880;

// The copy dialog sits this far from the top; a long list scrolls inside
// it.
export const COPY_MODAL_WIDTH = 640;
export const COPY_MODAL_TOP = 80;
export const SET_MISSING_MENU_WIDTH = 300;

// Below this width the detail pane becomes a drawer.
export const NARROW_QUERY = `(max-width: ${NARROW_WIDTH - 1}px)`;

export const layoutVariables = {
  '--rail-width': `${RAIL_WIDTH}px`,
  '--header-height': `${HEADER_HEIGHT}px`,
  '--pane-width': `${PANE_WIDTH}px`,
  '--settings-nav-width': `${SETTINGS_NAV_WIDTH}px`
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
