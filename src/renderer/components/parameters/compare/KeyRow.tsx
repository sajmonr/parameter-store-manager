import { memo } from 'react';
import { Tag, Tooltip, Flex } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { StructureEnvironment } from '../../../../shared/structure';
import { usePathDelimiter } from '../../../state/settings';
import type { CompareKey } from '../../../utils/compare';
import { cx } from '../../../utils/classNames';
import { NOT_SET_LABEL } from '../../../utils/labels';
import { leafOf } from '../../../utils/paths';
import Mono from '../../common/Mono';
import NotSetCell from '../NotSetCell';
import CompareValueCell from './CompareValueCell';
import SyncAction from './SyncAction';
import styles from '../CompareGrid.module.css';

interface KeyRowProps {
  row: CompareKey;
  environments: StructureEnvironment[];
  // The open parameter's name when it is one of this key's, otherwise null.
  selectedName: string | null;
  revealed: ReadonlySet<string>;
}

// The key, sticky on the left with its status tags, then its value in each
// environment.
const KeyRow = memo(
  ({ row, environments, selectedName, revealed }: KeyRowProps) => {
    const delimiter = usePathDelimiter();
    const { key, folder, cells, missing, unreadable, differs } = row;
    return (
      <div role="row" className={styles.row}>
        <Flex
          align="center"
          gap="small"
          role="rowheader"
          className={cx(
            styles.keyCell,
            folder && styles.indented,
            selectedName && styles.selectedKey
          )}
        >
          <Tooltip title={key}>
            <Mono size="small" weight={600} ellipsis className={styles.keyName}>
              {leafOf(key, delimiter)}
            </Mono>
          </Tooltip>
          <Flex
            component="span"
            align="center"
            gap="var(--ant-margin-xxs)"
            className={styles.tags}
          >
            {unreadable.length > 0 && (
              <Tooltip
                title={`Can't read the value in ${unreadable.join(', ')}, so it isn't compared`}
              >
                <WarningOutlined
                  className={styles.warning}
                  aria-label="Not compared"
                />
              </Tooltip>
            )}
            {differs && (
              <Tooltip title="Values aren't the same in every environment">
                <Tag color="warning">Differs</Tag>
              </Tooltip>
            )}
            {missing.length > 0 && (
              <Tooltip title={`${NOT_SET_LABEL} in ${missing.join(', ')}`}>
                <Tag color="error">Missing</Tag>
              </Tooltip>
            )}
            {(differs || missing.length > 0) && (
              <SyncAction row={row} environments={environments} />
            )}
          </Flex>
        </Flex>
        {environments.map(env => {
          const { segment } = env;
          const parameter = cells.get(segment);
          if (!parameter) {
            return (
              <NotSetCell
                key={segment}
                env={env}
                row={row}
                environments={environments}
              />
            );
          }
          return (
            <CompareValueCell
              key={segment}
              env={segment}
              parameter={parameter}
              unreadable={unreadable.includes(segment)}
              selected={parameter.Name === selectedName}
              revealed={revealed.has(parameter.Name)}
            />
          );
        })}
      </div>
    );
  }
);
KeyRow.displayName = 'KeyRow';

export default KeyRow;
