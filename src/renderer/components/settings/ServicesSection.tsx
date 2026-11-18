import { Card, Flex, Switch, Typography } from 'antd';
import { useSettingsStore } from '../../state/settings';
import EnvironmentsCard from './EnvironmentsCard';
import PathStructureCard from './PathStructureCard';
import ServicesCard from './ServicesCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';
import HintText from '../common/HintText';

// The whole card toggles the switch.
const StructureSwitchCard = () => {
  const enabled = useSettingsStore(settings => settings.structure.enabled);
  const update = useUpdateStructure();
  const toggle = () =>
    update(current => ({ ...current, enabled: !current.enabled }));

  return (
    <Card className={styles.switchCard} onClick={toggle}>
      <Flex justify="space-between" align="center" gap="middle">
        <div>
          <Typography.Text strong id="structure-switch-label">
            Group by service and environment
          </Typography.Text>
          <HintText className={styles.cardDescription}>
            Adds Services and Environments views to the parameter list. When
            off, parameters are shown by full path only.
          </HintText>
        </div>
        <Switch
          checked={enabled}
          aria-labelledby="structure-switch-label"
          onClick={(_, event) => event.stopPropagation()}
          onChange={toggle}
        />
      </Flex>
    </Card>
  );
};

// Turning the switch off hides the configuration but keeps it.
const ServicesSection = () => {
  const enabled = useSettingsStore(settings => settings.structure.enabled);
  return (
    <Flex vertical gap="middle">
      <StructureSwitchCard />
      {enabled && (
        <>
          <PathStructureCard />
          <EnvironmentsCard />
          <ServicesCard />
        </>
      )}
    </Flex>
  );
};

export default ServicesSection;
