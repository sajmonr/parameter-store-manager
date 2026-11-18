import SkeletonBar, { PLACEHOLDER_WIDTHS } from '../../common/SkeletonBar';
import styles from '../CompareGrid.module.css';

// The rows' places during the first load.
const PlaceholderRows = ({ columns }: { columns: number }) =>
  PLACEHOLDER_WIDTHS.map(([key, value], index) => (
    <div key={index} role="row" className={styles.row}>
      <div className={styles.keyCell}>
        <SkeletonBar width={key} />
      </div>
      {Array.from({ length: columns }, (_, column) => (
        <div key={column} className={styles.cell}>
          <SkeletonBar width={((value + column * 15) % 60) + 25} />
        </div>
      ))}
    </div>
  ));

export default PlaceholderRows;
