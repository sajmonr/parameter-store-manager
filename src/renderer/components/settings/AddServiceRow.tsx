import { useState } from 'react';
import { Button, Flex, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { segmentError } from '../../../shared/structure';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { updateStructure } from '../../state/settingsChanges';
import { cx } from '../../utils/classNames';
import { addService } from '../../utils/structureEdits';
import styles from './Settings.module.css';
import HintText from '../common/HintText';
import { describeError } from '../../utils/awsErrors';
import type { ErrorLike } from '../../utils/awsErrors';

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
      (saveError: unknown) => setError(describeError(saveError as ErrorLike))
    );
  };

  return (
    <div className={styles.cardFooter}>
      <Flex gap="small" align="flex-start" wrap>
        <Form.Item
          validateStatus={error ? 'error' : undefined}
          help={error}
          className={styles.inlineField}
        >
          <Input
            aria-label="New service"
            aria-invalid={!!error}
            placeholder="service-name"
            value={name}
            className={cx(styles.mono, styles.serviceInput)}
            onChange={event => {
              setName(event.target.value);
              setError(null);
            }}
            onPressEnter={add}
          />
        </Form.Item>
        <Button type="dashed" icon={<PlusOutlined />} onClick={add}>
          Add service
        </Button>
        <HintText>New services start in every environment.</HintText>
      </Flex>
    </div>
  );
};

export default AddServiceRow;
