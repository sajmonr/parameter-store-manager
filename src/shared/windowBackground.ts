// The window's background before antd's styles apply: antd's colorBgLayout
// in the light and dark algorithms. The main process paints the window with
// it, so it doesn't flash another colour on start or reload;
// app.global.css repeats it for the page.
export const WINDOW_BACKGROUND = { light: '#f5f5f5', dark: '#000000' };
