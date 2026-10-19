import { useState } from 'react';
import {
  Button,
  Checkbox,
  Flex,
  Input,
  Popconfirm,
  Table,
  Tag,
  Typography
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { segmentError } from '../../../shared/structure';
import type { StructureService } from '../../../shared/structure';
import usePageVisible from '../../hooks/usePageVisible';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { updateStructure } from '../../state/settingsChanges';
import { useUiStore } from '../../state/ui';
import { useStructuredParameters } from '../../state/views';
import { countAt } from '../../utils/structure';
import {
  addService,
  removeService,
  setServiceEnvironment
} from '../../utils/structureEdits';
import { EnvironmentDot } from './EnvironmentColor';
import SettingsCard from './SettingsCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';

// Typed into the add row, and checked when added.
const AddService = ({ onAdded }: { onAdded: (segment: string) => void }) => {
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
          className={`${styles.mono} ${styles.serviceInput}`}
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

const ServicesCard = () => {
  const structure = useSettingsStore(settings => settings.structure);
  const update = useUpdateStructure();
  const { byService, byServiceEnv, inOther } = useStructuredParameters();
  // Services added since the section was shown get a "new" tag.
  const [added, setAdded] = useState<string[]>([]);
  const pageVisible = usePageVisible();
  const sectionShown = useUiStore(
    state => state.settingsSection === 'services'
  );
  if (!(pageVisible && sectionShown) && added.length) setAdded([]);

  const environmentColumns: TableColumnsType<StructureService> =
    structure.environments.map(({ segment: env, color }) => ({
      key: `env:${env}`,
      title: (
        <Flex gap={6} align="center" className={styles.mono}>
          <EnvironmentDot color={color} />
          {env}
        </Flex>
      ),
      render: (_, service) => {
        const checked = service.environments.includes(env);
        const count = countAt(
          checked ? byServiceEnv : inOther,
          service.segment,
          env
        );
        return (
          <Flex gap={8} align="center">
            <Checkbox
              checked={checked}
              aria-label={`${service.segment} in ${env}`}
              onChange={event =>
                update(current =>
                  setServiceEnvironment(
                    current,
                    service.segment,
                    env,
                    event.target.checked
                  )
                )
              }
            />
            {checked ? (
              <span className={styles.count}>{count}</span>
            ) : (
              count > 0 && (
                <span className={styles.inOther}>{count} in Other</span>
              )
            )}
          </Flex>
        );
      }
    }));

  const columns: TableColumnsType<StructureService> = [
    {
      key: 'service',
      title: 'Service',
      render: (_, { segment }) => (
        <Flex gap={8} align="center">
          <AppstoreOutlined className={styles.serviceIcon} />
          <span className={styles.mono}>{segment}</span>
          {added.includes(segment) && <Tag color="blue">new</Tag>}
        </Flex>
      )
    },
    ...environmentColumns,
    {
      key: 'total',
      title: 'Total',
      width: 72,
      render: (_, { segment }) => byService.get(segment) ?? 0
    },
    {
      key: 'remove',
      width: 56,
      render: (_, { segment }) => (
        <Popconfirm
          title={`Remove ${segment}?`}
          description="Its parameters will appear under Other paths."
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => update(current => removeService(current, segment))}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            aria-label={`Remove ${segment}`}
          />
        </Popconfirm>
      )
    }
  ];

  return (
    <SettingsCard
      title="Services"
      description="Check the environments each service is deployed to. Unchecked combinations are listed under Other paths."
      flush
    >
      <Table<StructureService>
        rowKey="segment"
        columns={columns}
        dataSource={structure.services}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'No services yet' }}
      />
      <AddService onAdded={segment => setAdded(list => [...list, segment])} />
    </SettingsCard>
  );
};

export default ServicesCard;
