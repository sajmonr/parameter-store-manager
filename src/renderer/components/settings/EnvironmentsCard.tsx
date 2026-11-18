import { useState } from 'react';
import { Button } from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../state/settings';
import { useStructuredParameters } from '../../state/views';
import {
  moveEnvironment,
  nextColor,
  removeEnvironment,
  setEnvironmentColor
} from '../../utils/structureEdits';
import { EnvironmentColorPicker } from './EnvironmentColor';
import EnvironmentSegmentInput from './EnvironmentSegmentInput';
import SettingsCard from './SettingsCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';
import RemoveSegmentButton from './RemoveSegmentButton';
import SortableTable, { DragHandle } from './SortableTable';

interface EnvironmentRow {
  key: string;
  segment: string;
  color: string;
  // The added row, kept here until its segment is valid.
  added?: boolean;
}

// Segments can't contain spaces, so this key can't clash with one.
const ADDED_KEY = ' added';
const LOCKED: ReadonlySet<string> = new Set([ADDED_KEY]);

const EnvironmentsCard = () => {
  const structure = useSettingsStore(settings => settings.structure);
  const update = useUpdateStructure();
  const { byEnv } = useStructuredParameters();
  // The colour of the row being added, or null when there is none.
  const [addedColor, setAddedColor] = useState<string | null>(null);
  const segments = structure.environments.map(e => e.segment);
  const rows: EnvironmentRow[] = structure.environments.map(e => ({
    key: e.segment,
    ...e
  }));
  if (addedColor) {
    rows.push({ key: ADDED_KEY, segment: '', color: addedColor, added: true });
  }

  const columns: TableColumnsType<EnvironmentRow> = [
    {
      key: 'sort',
      width: 40,
      render: (_, row) => !row.added && <DragHandle label={row.segment} />
    },
    {
      key: 'color',
      title: 'Color',
      width: 64,
      render: (_, row) => (
        <EnvironmentColorPicker
          color={row.color}
          label={row.segment || 'New environment'}
          // A row's colour can change once its segment is saved.
          onChange={
            row.added
              ? undefined
              : color =>
                  update(current =>
                    setEnvironmentColor(current, row.segment, color)
                  )
          }
        />
      )
    },
    {
      key: 'segment',
      title: 'Path segment',
      render: (_, row) => (
        <EnvironmentSegmentInput
          segment={row.added ? null : row.segment}
          color={row.color}
          segments={segments}
          onAdded={() => setAddedColor(null)}
        />
      )
    },
    {
      key: 'count',
      title: 'Parameters',
      width: 110,
      render: (_, row) => !row.added && (byEnv.get(row.segment) ?? 0)
    },
    {
      key: 'remove',
      width: 56,
      render: (_, row) =>
        row.added ? (
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            aria-label="Discard new environment"
            // Leaving the input would save its segment first.
            onMouseDown={event => event.preventDefault()}
            onClick={() => setAddedColor(null)}
          />
        ) : (
          <RemoveSegmentButton
            segment={row.segment}
            onRemove={() =>
              update(current => removeEnvironment(current, row.segment))
            }
          />
        )
    }
  ];

  return (
    <SettingsCard
      title="Environments"
      description="Path segments that name an environment. The order here is the order of the environment tabs."
      flush
    >
      <SortableTable<EnvironmentRow>
        items={segments}
        locked={LOCKED}
        onMove={(key, overKey) =>
          update(current => moveEnvironment(current, key, overKey))
        }
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'No environments' }}
      />
      <div className={styles.cardFooter}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAddedColor(color => color ?? nextColor(structure))}
        >
          Add environment
        </Button>
      </div>
    </SettingsCard>
  );
};

export default EnvironmentsCard;
