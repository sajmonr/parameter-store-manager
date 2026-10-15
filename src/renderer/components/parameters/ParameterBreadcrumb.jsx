import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Breadcrumb, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { selectors as parameterSelectors } from '../../ducks/parameters';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import { folderChain } from '../../utils/paths';
import styles from './ParameterBreadcrumb.module.css';

// "All parameters / seg / seg" for the scope; each item changes the scope.
const ParameterBreadcrumb = ({ count }) => {
  const dispatch = useDispatch();
  const scope = useSelector(uiSelectors.getScope);
  const delimiter = useSelector(settingsSelectors.getPathDelimiter);
  // Pages arrive one by one, so the count would keep rolling until done.
  const loading = useSelector(parameterSelectors.getIsAllParametersLoading);

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
        onClick={() => dispatch(uiActions.setScope(key))}
        onKeyDown={event => {
          if (event.key === 'Enter') dispatch(uiActions.setScope(key));
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

ParameterBreadcrumb.propTypes = {
  count: PropTypes.number.isRequired
};

export default ParameterBreadcrumb;
