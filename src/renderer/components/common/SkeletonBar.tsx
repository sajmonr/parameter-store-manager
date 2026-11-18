import { Skeleton } from 'antd';

// Widths, in percent, of the name and value placeholders of the loading
// rows, so the rows don't look identical.
export const PLACEHOLDER_WIDTHS: [name: number, value: number][] = [
  [40, 55],
  [60, 30],
  [35, 70],
  [50, 40],
  [45, 60],
  [30, 35],
  [55, 50],
  [40, 45]
];

// A loading placeholder for a line of text, `width` percent of its column.
const SkeletonBar = ({
  width,
  height = 14
}: {
  width: number;
  height?: number;
}) => (
  <Skeleton.Input
    active
    size="small"
    style={{ width: `${width}%`, minWidth: 0, height }}
  />
);

export default SkeletonBar;
