import { useState } from 'react';
import { Button, Flex, Input, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { segmentError } from '../../../shared/structure';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { updateStructure } from '../../state/settingsChanges';
import { cx } from '../../utils/classNames';
import { addService } from '../../utils/structureEdits';
import styles from './Settings.module.css';

// Typed into the add row, and checked when added.
const AddServiceRow = ({ onAdded }: { onAdded: (segment: string) => void }) => {
  const services = useSettingsStore(settings => settings.structure.services);
  const delimiter = usePathDelimiter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const invalid = segmentError(
      name,
      delimiter,
      services.map(s => s.segment)
    );
    if (invalid) {
      setError(invalid);
      return;
    }
    updateStructure(current => addService(current, name)).then(
      () => {
        onAdded(name);
        // A name typed while the save ran is kept.
        setName(current => (current === name ? '' : current));
      },
      (saveError: Error) => setError(saveError.message)
    );
  };

  return (
    <div className={styles.cardFooter}>
      <Flex gap={8} align="center" wrap>
        <Input
          aria-label="New service"
          aria-invalid={!!error}
          placeholder="service-name"
          value={name}
          status={error ? 'error' : undefined}
          className={cx(styles.mono, styles.serviceInput)}
          onChange={event => {
            setName(event.target.value);
            setError(null);
          }}
          onPressEnter={add}
        />
        <Button type="dashed" icon={<PlusOutlined />} onClick={add}>
          Add service
        </Button>
        <Typography.Text type="secondary" className={styles.hint}>
          New services start in every environment.
        </Typography.Text>
      </Flex>
      {error && (
        <Typography.Text type="danger" className={styles.fieldError}>
          {error}
        </Typography.Text>
      )}
    </div>
  );
};

export default AddServiceRow;
