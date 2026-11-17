import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { theme, Typography } from 'antd';
import { COUNT_PLACEHOLDER } from '../../utils/labels';

// How faint the text is: secondary for details, tertiary for counts next to
// a label, quaternary for what's barely there.
export type MetaTone = 'secondary' | 'tertiary' | 'quaternary';

export type MetaTextProps = Omit<
  ComponentProps<typeof Typography.Text>,
  'type'
> & { tone?: MetaTone };

// Small text about something else: a count, a date, a source.
const MetaText = forwardRef<HTMLSpanElement, MetaTextProps>(
  ({ tone = 'secondary', style, ...rest }, ref) => {
    const { token } = theme.useToken();
    const color = {
      secondary: token.colorTextSecondary,
      tertiary: token.colorTextTertiary,
      quaternary: token.colorTextQuaternary
    }[tone];
    return (
      <Typography.Text
        ref={ref}
        style={{ fontSize: token.fontSizeSM, color, ...style }}
        {...rest}
      />
    );
  }
);
MetaText.displayName = 'MetaText';

export type CountTextProps = Omit<MetaTextProps, 'children'> & {
  count: number;
  // Until the first load finishes, the count shows a placeholder: it would
  // keep rolling as names arrive.
  loaded?: boolean;
};

// A count next to a label, in the user's number format.
export const CountText = forwardRef<HTMLSpanElement, CountTextProps>(
  ({ count, loaded = true, tone = 'tertiary', ...rest }, ref) => (
    <MetaText ref={ref} tone={tone} {...rest}>
      {loaded ? count.toLocaleString() : COUNT_PLACEHOLDER}
    </MetaText>
  )
);
CountText.displayName = 'CountText';

export default MetaText;
