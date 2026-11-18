import { Flex, Tag, Tooltip } from 'antd';
import type { ImportStatus } from '../../../utils/importPlan';
import { cx } from '../../../utils/classNames';
import { ALWAYS_COUNTED, STAT_ORDER, STATUSES } from './importStatuses';
import styles from '../ImportReview.module.css';

// The count of each status. Clicking one narrows the list to it; clicking
// it again shows every row.
const StatFilter = ({
  counts,
  shown,
  onShow
}: {
  counts: Record<ImportStatus, number>;
  shown: ImportStatus | null;
  onShow: (status: ImportStatus | null) => void;
}) => (
  <Flex gap="small" wrap role="group" aria-label="Summary">
    {STAT_ORDER.filter(
      status => ALWAYS_COUNTED.has(status) || counts[status]
    ).map(status => {
      const active = shown === status;
      return (
        <Tooltip key={status} title={STATUSES[status].tooltip}>
          <button
            type="button"
            className={cx(
              styles.statButton,
              shown && !active && styles.statInactive
            )}
            aria-pressed={active}
            // A status that has gone to 0 can still be turned off.
            disabled={!counts[status] && !active}
            onClick={() => onShow(active ? null : status)}
          >
            <Tag color={STATUSES[status].color} className={styles.stat}>
              {counts[status].toLocaleString()} {STATUSES[status].label}
            </Tag>
          </button>
        </Tooltip>
      );
    })}
  </Flex>
);

export default StatFilter;
