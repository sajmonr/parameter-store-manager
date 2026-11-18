// The window's size, set by the main process. The renderer's layout
// (renderer/utils/layout) depends on the breakpoint.

export const WINDOW_WIDTH = 1280;
export const WINDOW_HEIGHT = 800;
// Below the narrow breakpoint the detail pane becomes a drawer; below this
// the table and folder tree get too narrow to read.
export const WINDOW_MIN_WIDTH = 900;
export const WINDOW_MIN_HEIGHT = 600;

// From this window width down, the detail pane is a drawer.
export const NARROW_WIDTH = 1100;
