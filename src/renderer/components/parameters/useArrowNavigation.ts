import { useEffect } from 'react';
import type { ParameterEntry } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import usePageVisible from '../../hooks/usePageVisible';

// ↑/↓ move the selection unless the user is typing or using another widget.
const isArrowNavigationTarget = (target: EventTarget | null) =>
  !(target instanceof Element) ||
  !target.closest(
    'input, textarea, select, [contenteditable], [role="tree"], .ant-modal, .ant-popover, .ant-drawer'
  );

// ↑ and ↓ select the previous and next of `parameters` while the page is
// shown; with none selected, the first.
const useArrowNavigation = (
  parameters: ParameterEntry[],
  selectedName: string | null
) => {
  const pageVisible = usePageVisible();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!pageVisible || !parameters.length) return;
      if (!isArrowNavigationTarget(event.target)) return;
      event.preventDefault();
      const index = parameters.findIndex(p => p.Name === selectedName);
      let next = 0;
      if (index >= 0) {
        next =
          event.key === 'ArrowDown'
            ? Math.min(parameters.length - 1, index + 1)
            : Math.max(0, index - 1);
      }
      const nextParameter = parameters[next];
      if (nextParameter) uiActions.selectParameter(nextParameter.Name);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [parameters, selectedName, pageVisible]);
};

export default useArrowNavigation;
