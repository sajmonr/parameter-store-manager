import { Alert, Radio, Typography } from 'antd';
import type { Layout, Structure } from '../../../shared/structure';
import { useParameters } from '../../state/parameters';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { useStructuredParameters } from '../../state/views';
import { rootFolder } from '../../utils/paths';
import { useEnvironmentColor } from './EnvironmentColor';
import SettingsCard from './SettingsCard';
import { useUpdateStructure } from './useSaveSettings';
import styles from './Settings.module.css';

const layouts: { value: Layout; caption: string }[] = [
  { value: 'env-first', caption: 'Environment convention' },
  { value: 'svc-first', caption: 'Services convention' }
];

// A path in `layout`, with the environment and service segments coloured.
const LayoutExample = ({
  layout,
  structure,
  delimiter
}: {
  layout: Layout;
  structure: Structure;
  delimiter: string;
}) => {
  const env = structure.environments[0] ?? {
    segment: 'development',
    color: 'green'
  };
  const service = structure.services[0]?.segment ?? 'my-service';
  const envColor = useEnvironmentColor(env.color);
  const serviceColor = useEnvironmentColor('blue');
  const envPart = (
    <span key="env" style={{ color: envColor }}>
      {env.segment}
    </span>
  );
  const servicePart = (
    <span key="service" style={{ color: serviceColor }}>
      {service}
    </span>
  );
  const [first, second] =
    layout === 'env-first' ? [envPart, servicePart] : [servicePart, envPart];
  return (
    <div className={styles.layoutExample}>
      {rootFolder(delimiter)}
      {first}
      {delimiter}
      {second}
      {`${delimiter}ConnectionStrings${delimiter}Db`}
    </div>
  );
};

// Never guesses the layout: the stats only show how the chosen one reads.
const PathStructureCard = () => {
  const structure = useSettingsStore(settings => settings.structure);
  const delimiter = usePathDelimiter();
  const update = useUpdateStructure();
  const { parameters, syncedAt } = useParameters();
  const { matches } = useStructuredParameters();
  const total = parameters.length;

  const pattern = (layout: Layout) => {
    const segments =
      layout === 'env-first'
        ? ['{environment}', '{service}']
        : ['{service}', '{environment}'];
    return `${rootFolder(delimiter)}${segments.join(delimiter)}${delimiter}…`;
  };

  return (
    <SettingsCard
      title="Path structure"
      description="Which segment comes first in a parameter name."
    >
      <Radio.Group
        value={structure.layout}
        onChange={event => {
          const layout = event.target.value as Layout;
          update(current => ({ ...current, layout }));
        }}
        className={styles.layouts}
      >
        {layouts.map(({ value, caption }) => (
          <Radio
            key={value}
            value={value}
            classNames={{
              root: styles.layoutOption,
              icon: styles.layoutRadio,
              label: styles.layoutLabel
            }}
          >
            <div className={styles.layoutPattern}>{pattern(value)}</div>
            <LayoutExample
              layout={value}
              structure={structure}
              delimiter={delimiter}
            />
            <Typography.Text type="secondary" className={styles.caption}>
              {caption}
            </Typography.Text>
          </Radio>
        ))}
      </Radio.Group>
      {/* Counts while the first load streams in would be partial, and an
          empty account has nothing to count. */}
      {syncedAt &&
        total > 0 &&
        (matches.size > 0 ? (
          <Alert
            type="success"
            showIcon
            className={styles.stats}
            title={`${matches.size} of ${total} parameters match. ${total - matches.size} appear under Other paths.`}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            className={styles.stats}
            title={`No parameters match this structure. All ${total} will appear under Other paths.`}
          />
        ))}
    </SettingsCard>
  );
};

export default PathStructureCard;
