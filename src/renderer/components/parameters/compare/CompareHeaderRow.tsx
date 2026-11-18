import { Flex } from 'antd';
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
    <Flex
      align="center"
      gap="small"
      role="columnheader"
      className={styles.keyCell}
    >
      Key
    </Flex>
    {environments.map(({ segment, color }, index) => (
      <Flex
        align="center"
        gap="small"
        key={segment}
        role="columnheader"
        className={styles.cell}
      >
        <EnvironmentLabel
          color={color}
          name={segment}
          count={counts[index]}
          loaded={ready}
          ellipsis
        />
      </Flex>
    ))}
  </div>
);

export default CompareHeaderRow;
