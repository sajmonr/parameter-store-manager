// The app's antd theme: the default or dark algorithm with the app's code
// font, and the component tokens that set the app's density. Styles use
// these tokens (as CSS variables in stylesheets) instead of their own
// numbers.
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const fontFamilyCode =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const appTheme = (dark: boolean): ThemeConfig => ({
  algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: { fontFamilyCode },
  components: {
    // The forms sit in narrow panes and cards.
    Form: { itemMarginBottom: 16 }
  }
});

// The parameter table fills the main area edge to edge, so it has no
// rounded corners.
export const flushTableTheme: ThemeConfig = {
  components: {
    Table: { headerBorderRadius: 0, borderRadiusLG: 0 }
  }
};
