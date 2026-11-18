import { Button, Tooltip } from 'antd';
import { RetweetOutlined } from '@ant-design/icons';
import type { StructureEnvironment } from '../../../../shared/structure';
import { uiActions } from '../../../state/ui';
import { copyBlockReason, copySourceOf } from '../../../utils/compare';
import type { CompareKey } from '../../../utils/compare';

const SYNC_LABEL = 'Synchronize environments';

// Opens Synchronize environments for a key that differs or is missing
// somewhere, from the first environment whose value can be copied.
const SyncAction = ({
  row,
  environments
}: {
  row: CompareKey;
  environments: StructureEnvironment[];
}) => {
  const source = copySourceOf(row, environments);
  const blocked = copyBlockReason(source);
  return (
    <Tooltip title={blocked ?? SYNC_LABEL}>
      <Button
        type="text"
        size="small"
        icon={<RetweetOutlined />}
        aria-label={SYNC_LABEL}
        disabled={!!blocked}
        onClick={() =>
          source && uiActions.openCopyDialog(source.Name, { pickSource: true })
        }
      />
    </Tooltip>
  );
};

export default SyncAction;
