import { Flex } from 'antd';
import SkeletonBar, { PLACEHOLDER_WIDTHS } from '../../common/SkeletonBar';
import styles from '../CompareGrid.module.css';

// The rows' places during the first load.
const PlaceholderRows = ({ columns }: { columns: number }) =>
  PLACEHOLDER_WIDTHS.map(([key, value], index) => (
    <div key={index} role="row" className={styles.row}>
      <Flex align="center" gap="small" className={styles.keyCell}>
        <SkeletonBar width={key} />
      </Flex>
      {Array.from({ length: columns }, (_, column) => (
        <Flex align="center" gap="small" key={column} className={styles.cell}>
          <SkeletonBar width={((value + column * 15) % 60) + 25} />
        </Flex>
      ))}
    </div>
  ));

export default PlaceholderRows;
