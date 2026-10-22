import { Badge, Breadcrumb, Spin, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useParameters } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { useLocation } from '../../state/views';
import { isEnvironmentLocation, isOtherLocation } from '../../utils/location';
import type { Location, LocationContext } from '../../utils/location';
import { folderChain } from '../../utils/paths';
import { environmentColorOf, layoutPattern } from '../../utils/structure';
import EnvironmentDot from '../common/EnvironmentDot';
import EnvironmentTabs from './EnvironmentTabs';
import SelectionBar from './SelectionBar';
import styles from './ParameterBreadcrumb.module.css';

interface Crumb {
  key: string;
  label: ReactNode;
  location: Location;
}

const envLabel = (env: string, color: string | undefined) =>
  color ? (
    <span className={styles.env}>
      <EnvironmentDot color={color} />
      {env}
    </span>
  ) : (
    env
  );

// The location and each place above it, outermost first.
const crumbsOf = (location: Location, context: LocationContext): Crumb[] => {
  const { structure, delimiter } = context;
  if (location.view === 'paths') {
    return [
      {
        key: '',
        label: 'All parameters',
        location: { view: 'paths', scope: '' }
      },
      ...folderChain(location.scope, delimiter).map(({ key, label }) => {
        const color = environmentColorOf(key, structure, delimiter);
        return {
          key,
          label: envLabel(label, color ?? undefined),
          location: { view: 'paths', scope: key } as const
        };
      })
    ];
  }
  const folders = folderChain(location.folder, delimiter);
  if (isOtherLocation(location)) {
    return [
      { key: '', label: 'Other paths', location: { ...location, folder: '' } },
      ...folders.map(({ key, label }) => ({
        key,
        label,
        location: { ...location, folder: key }
      }))
    ];
  }
  if (isEnvironmentLocation(location)) {
    const { env, service } = location;
    const color = structure.environments.find(e => e.segment === env)?.color;
    const crumbs: Crumb[] = [
      {
        key: 'env',
        label: envLabel(env, color),
        location: { ...location, service: null, folder: '' }
      }
    ];
    if (!service) return crumbs;
    return [
      ...crumbs,
      {
        key: '',
        label: service,
        location: { ...location, folder: '' }
      },
      ...folders.map(({ key, label }) => ({
        key,
        label,
        location: { ...location, folder: key }
      }))
    ];
  }
  return [
    {
      key: '',
      label: location.service,
      location: { ...location, folder: '' }
    },
    ...folders.map(({ key, label }) => ({
      key,
      label,
      location: { ...location, folder: key }
    }))
  ];
};

interface ParameterBreadcrumbProps {
  count: number;
  checked: string[];
}

// The location as a breadcrumb, each item going there, and the row count.
// A service adds its environment tabs; Other paths says why names are there.
// Checked rows add their actions at the end. It is one row that never wraps:
// the breadcrumb and the hint shrink first.
const ParameterBreadcrumb = ({ count, checked }: ParameterBreadcrumbProps) => {
  const location = useLocation();
  const context = useLocationContext();
  // Pages arrive one by one, so the count would keep rolling until done.
  const { loading } = useParameters();

  const items = crumbsOf(location, context).map(crumb => ({
    key: crumb.key,
    title: (
      <span
        role="link"
        tabIndex={0}
        className={styles.item}
        onClick={() => uiActions.setLocation(crumb.location)}
        onKeyDown={event => {
          if (event.key === 'Enter') uiActions.setLocation(crumb.location);
        }}
      >
        {crumb.label}
      </span>
    )
  }));

  return (
    <div className={styles.header}>
      <Breadcrumb items={items} className={styles.breadcrumb} />
      {loading ? (
        <Spin size="small" aria-label="Counting parameters" />
      ) : (
        <Badge
          count={count}
          showZero
          overflowCount={99999}
          className={styles.count}
        />
      )}
      <EnvironmentTabs />
      <div className={styles.end}>
        {isOtherLocation(location) && (
          <Typography.Text type="secondary" className={styles.hint} ellipsis>
            Don&apos;t match{' '}
            {layoutPattern(context.structure.layout, context.delimiter)}
          </Typography.Text>
        )}
        <SelectionBar checked={checked} />
      </div>
    </div>
  );
};

export default ParameterBreadcrumb;
