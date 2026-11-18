import { useState } from 'react';
import { Flex, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { StructureService } from '../../../shared/structure';
import usePageVisible from '../../hooks/usePageVisible';
import { useSettingsStore } from '../../state/settings';
import { useUiStore } from '../../state/ui';
import { useStructuredParameters } from '../../state/views';
import {
  removeService,
  setServiceEnvironment
} from '../../utils/structureEdits';
import SettingsCard from './SettingsCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';
import { OTHER_PATHS_LABEL } from '../../utils/labels';
import EnvironmentLabel from '../common/EnvironmentLabel';
import AddServiceRow from './AddServiceRow';
import RemoveSegmentButton from './RemoveSegmentButton';
import ServiceEnvironmentCell from './ServiceEnvironmentCell';
import Mono from '../common/Mono';
import { SETTINGS_COLUMN_WIDTH } from '../../utils/layout';

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
      title: <EnvironmentLabel color={color} name={<Mono>{env}</Mono>} />,
      render: (_, service) => (
        <ServiceEnvironmentCell
          service={service.segment}
          env={env}
          checked={service.environments.includes(env)}
          counts={{ byServiceEnv, inOther }}
          onChange={checked =>
            update(current =>
              setServiceEnvironment(current, service.segment, env, checked)
            )
          }
        />
      )
    }));

  const columns: TableColumnsType<StructureService> = [
    {
      key: 'service',
      title: 'Service',
      render: (_, { segment }) => (
        <Flex gap="small" align="center">
          <AppstoreOutlined className={styles.serviceIcon} />
          <Mono>{segment}</Mono>
          {added.includes(segment) && <Tag color="blue">new</Tag>}
        </Flex>
      )
    },
    ...environmentColumns,
    {
      key: 'total',
      title: 'Total',
      width: SETTINGS_COLUMN_WIDTH.total,
      render: (_, { segment }) => byService.get(segment) ?? 0
    },
    {
      key: 'remove',
      width: SETTINGS_COLUMN_WIDTH.remove,
      render: (_, { segment }) => (
        <RemoveSegmentButton
          segment={segment}
          onRemove={() => update(current => removeService(current, segment))}
        />
      )
    }
  ];

  return (
    <SettingsCard
      title="Services"
      description={`Check the environments each service is deployed to. Unchecked combinations are listed under ${OTHER_PATHS_LABEL}.`}
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
      <AddServiceRow
        onAdded={segment => setAdded(list => [...list, segment])}
      />
    </SettingsCard>
  );
};

export default ServicesCard;
