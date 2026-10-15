import { Badge, Breadcrumb, Spin } from 'antd';
import { useParameters } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { folderChain } from '../../utils/paths';
import styles from './ParameterBreadcrumb.module.css';

// "All parameters / seg / seg" for the scope; each item changes the scope.
const ParameterBreadcrumb = ({ count }: { count: number }) => {
  const scope = useUiStore(state => state.scope);
  const delimiter = usePathDelimiter();
  // Pages arrive one by one, so the count would keep rolling until done.
  const { loading } = useParameters();

  const items = [
    { key: '', label: 'All parameters' },
    ...folderChain(scope, delimiter)
  ].map(({ key, label }) => ({
    key,
    title: (
      <span
        role="link"
        tabIndex={0}
        className={styles.item}
        onClick={() => uiActions.setScope(key)}
        onKeyDown={event => {
          if (event.key === 'Enter') uiActions.setScope(key);
        }}
      >
        {label}
      </span>
    )
  }));

  return (
    <div className={styles.bar}>
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
    </div>
  );
};

export default ParameterBreadcrumb;
