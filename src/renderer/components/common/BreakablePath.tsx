import { Fragment } from 'react';

interface BreakablePathProps {
  path: string;
  delimiter: string;
}

// A path that wraps after a delimiter rather than inside a segment.
const BreakablePath = ({ path, delimiter }: BreakablePathProps) =>
  path.split(delimiter).map((segment, index, segments) => (
    <Fragment key={index}>
      {segment}
      {index < segments.length - 1 && (
        <>
          {delimiter}
          <wbr />
        </>
      )}
    </Fragment>
  ));

export default BreakablePath;
