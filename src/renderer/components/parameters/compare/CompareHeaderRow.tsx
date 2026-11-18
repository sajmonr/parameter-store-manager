import type { StructureEnvironment } from '../../../../shared/structure';
import { cx } from '../../../utils/classNames';
import EnvironmentLabel from '../../common/EnvironmentLabel';
import styles from '../CompareGrid.module.css';

// The column headers: the key column, then each environment with how many
// of the keys it has.
const CompareHeaderRow = ({
  environments,
  counts,
  ready
}: {
  environments: StructureEnvironment[];
  counts: number[];
  // Until every name is listed, the counts are placeholders.
  ready: boolean;
}) => (
  <div role="row" className={cx(styles.row, styles.headerRow)}>
    <div role="columnheader" className={styles.keyCell}>
      Key
    </div>
    {environments.map(({ segment, color }, index) => (
      <div key={segment} role="columnheader" className={styles.cell}>
        <EnvironmentLabel
          color={color}
          name={segment}
          count={counts[index]}
          loaded={ready}
          ellipsis
        />
      </div>
    ))}
  </div>
);

export default CompareHeaderRow;
