import { createContext, useContext, useMemo, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { Button, Popconfirm, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DraggableAttributes,
  DraggableSyntheticListeners
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { segmentError } from '../../../shared/structure';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { updateStructure } from '../../state/settingsChanges';
import { useStructuredParameters } from '../../state/views';
import {
  addEnvironment,
  moveEnvironment,
  nextColor,
  removeEnvironment,
  renameEnvironment,
  setEnvironmentColor
} from '../../utils/structureEdits';
import { EnvironmentColorPicker } from './EnvironmentColor';
import SegmentInput from './SegmentInput';
import SettingsCard from './SettingsCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';

interface EnvironmentRow {
  key: string;
  segment: string;
  color: string;
  // The added row, kept here until its segment is valid.
  added?: boolean;
}

// Segments can't contain spaces, so this key can't clash with one.
const ADDED_KEY = ' added';

// The drag handle is in a cell; the row it moves passes it what it needs.
interface RowDrag {
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
}

const RowDragContext = createContext<RowDrag>({});

const DragHandle = ({ label }: { label: string }) => {
  const { setActivatorNodeRef, listeners, attributes } =
    useContext(RowDragContext);
  return (
    <Button
      type="text"
      size="small"
      icon={<HolderOutlined />}
      className={styles.dragHandle}
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Move ${label}`}
    />
  );
};

interface RowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

// A table row that moves with dnd-kit, as in antd's sortable table example.
const SortableRow = (props: RowProps) => {
  const id = props['data-row-key'];
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: id === ADDED_KEY });

  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 1 } : {})
  };

  const drag = useMemo(
    () => ({ setActivatorNodeRef, listeners, attributes }),
    [setActivatorNodeRef, listeners, attributes]
  );

  return (
    <RowDragContext.Provider value={drag}>
      <tr {...props} ref={setNodeRef} style={style} />
    </RowDragContext.Provider>
  );
};

const tableComponents = { body: { row: SortableRow } };

const EnvironmentsCard = () => {
  const structure = useSettingsStore(settings => settings.structure);
  const delimiter = usePathDelimiter();
  const update = useUpdateStructure();
  const { byEnv } = useStructuredParameters();
  // The colour of the row being added, or null when there is none.
  const [addedColor, setAddedColor] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const segments = structure.environments.map(e => e.segment);
  const rows: EnvironmentRow[] = structure.environments.map(e => ({
    key: e.segment,
    ...e
  }));
  if (addedColor) {
    rows.push({ key: ADDED_KEY, segment: '', color: addedColor, added: true });
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      update(current =>
        moveEnvironment(current, String(active.id), String(over.id))
      );
    }
  };

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
      render: (_, row) =>
        row.added ? (
          <SegmentInput
            label="New environment"
            value=""
            autoFocus
            validate={value => segmentError(value, delimiter, segments)}
            onSave={segment =>
              updateStructure(current =>
                addEnvironment(current, segment, row.color)
              ).then(() => setAddedColor(null))
            }
            onCancel={() => setAddedColor(null)}
          />
        ) : (
          <SegmentInput
            label={`Environment ${row.segment}`}
            value={row.segment}
            validate={value =>
              segmentError(
                value,
                delimiter,
                segments.filter(s => s !== row.segment)
              )
            }
            onSave={segment =>
              updateStructure(current =>
                renameEnvironment(current, row.segment, segment)
              )
            }
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
          <Popconfirm
            title={`Remove ${row.segment}?`}
            description="Its parameters will appear under Other paths."
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              update(current => removeEnvironment(current, row.segment))
            }
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`Remove ${row.segment}`}
            />
          </Popconfirm>
        )
    }
  ];

  return (
    <SettingsCard
      title="Environments"
      description="Path segments that name an environment. The order here is the order of the environment tabs."
      flush
    >
      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={segments}
          strategy={verticalListSortingStrategy}
        >
          <Table<EnvironmentRow>
            rowKey="key"
            components={tableComponents}
            columns={columns}
            dataSource={rows}
            pagination={false}
            locale={{ emptyText: 'No environments' }}
          />
        </SortableContext>
      </DndContext>
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
