import { Flex } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { StructureEnvironment } from '../../../shared/structure';
import { useLocationContext } from '../../state/settings';
import type { CompareKey } from '../../utils/compare';
import { parse } from '../../utils/structure';
import SetMissingMenu from '../setMissing/SetMissingMenu';
import styles from './CompareGrid.module.css';
import { NOT_SET_LABEL } from '../../utils/labels';
import { cx } from '../../utils/classNames';

interface NotSetCellProps {
  // The environment without the key.
  env: StructureEnvironment;
  row: CompareKey;
  // The service's environments, in the configured order.
  environments: StructureEnvironment[];
}

// A key missing in one environment, with a menu that sets it there.
const NotSetCell = ({ env, row, environments }: NotSetCellProps) => {
  const { structure, delimiter } = useLocationContext();
  // The key is in the grid, so at least one environment has it.
  const sources = environments.flatMap(e => {
    const parameter = row.cells.get(e.segment);
    return parameter
      ? [{ ...e, name: parameter.Name, type: parameter.Type }]
      : [];
  });
  const first = row.cells.get(sources[0]!.segment)!;
  const service = parse(first.Name, structure, delimiter)?.service ?? '';

  return (
    <Flex align="center" gap="small" role="cell" className={styles.cell}>
      <SetMissingMenu
        service={service}
        parameterKey={row.key}
        target={env}
        sources={sources}
        template={first}
      >
        {open => (
          <button
            type="button"
            className={cx(styles.notSet, open && styles.open)}
            // Not a click on the cell.
            onClick={event => event.stopPropagation()}
          >
            {NOT_SET_LABEL}
            <PlusOutlined className={styles.notSetIcon} />
          </button>
        )}
      </SetMissingMenu>
    </Flex>
  );
};

export default NotSetCell;
