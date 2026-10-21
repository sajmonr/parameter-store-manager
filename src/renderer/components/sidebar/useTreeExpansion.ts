import { useState } from 'react';
import type { Key } from 'react';
import { uiActions, useUiStore } from '../../state/ui';
import { useMatcher } from '../../state/views';
import type { LocationView } from '../../utils/location';

// The expanded nodes of a view's tree. While searching, every matching
// branch (`searchKeys`) starts expanded; expanding or collapsing during a
// search lasts until the query changes.
const useTreeExpansion = (view: LocationView, searchKeys: string[]) => {
  const matcher = useMatcher();
  const stored = useUiStore(state => state.expanded[view]);
  const [searchExpansion, setSearchExpansion] = useState<{
    query: string;
    keys: string[];
  }>({
    query: '',
    keys: []
  });
  const searching = !!matcher.query;

  let expandedKeys = stored;
  if (searching) {
    expandedKeys =
      searchExpansion.query === matcher.query
        ? searchExpansion.keys
        : searchKeys;
  }
  const onExpand = (expanded: Key[]) => {
    const keys = expanded.map(String);
    if (searching) setSearchExpansion({ query: matcher.query, keys });
    else uiActions.setExpanded(view, keys);
  };

  return {
    expandedKeys,
    onExpand,
    // Plain-text matches are highlighted in the labels.
    highlight: searching && !matcher.isGlob ? matcher.query : ''
  };
};

export default useTreeExpansion;
