// A table whose rows can be dragged into another order, with the mouse or
// the keyboard, as in antd's sortable table example (dnd-kit).
import { createContext, useContext, useMemo } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
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
import styles from './Settings.module.css';

// The drag handle is in a cell; the row it moves passes it what it needs.
interface RowDrag {
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
}

const RowDragContext = createContext<RowDrag>({});

// Rows that can't move, by key.
const LockedContext = createContext<ReadonlySet<string>>(new Set());

// The handle that drags its row; put it in a cell of the row.
export const DragHandle = ({ label }: { label: string }) => {
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

// A table row that moves with dnd-kit.
const SortableRow = (props: RowProps) => {
  const id = props['data-row-key'];
  const locked = useContext(LockedContext);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: locked.has(id) });

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

type SortableTableProps<T> = Omit<TableProps<T>, 'components' | 'rowKey'> & {
  // The row keys that can be sorted, in order.
  items: string[];
  // Rows that stay put, such as one being added.
  locked?: ReadonlySet<string>;
  // A row was dropped on another's place.
  onMove: (key: string, overKey: string) => void;
};

// Rows are keyed by their `key` field.
const SortableTable = <T extends { key: string }>({
  items,
  locked = new Set(),
  onMove,
  ...rest
}: SortableTableProps<T>) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      onMove(String(active.id), String(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <LockedContext.Provider value={locked}>
          <Table<T> rowKey="key" components={tableComponents} {...rest} />
        </LockedContext.Provider>
      </SortableContext>
    </DndContext>
  );
};

export default SortableTable;
