import { useState } from 'react';
import type { ReactElement } from 'react';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import type { StructureEnvironment } from '../../../shared/structure';
import { isEditableType } from '../../../shared/parameterTypes';
import type { ParameterEntry } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { pathOf } from '../../utils/structure';
import useEscape from '../../hooks/useEscape';
import { SET_MISSING_MENU_WIDTH } from '../../utils/layout';
import { missingValuePrefill, setMissingItems } from './menuItems';
import type { SourceEnvironment } from './menuItems';

interface SetMissingMenuProps {
  service: string;
  // The key below the service: 'AppServer/Port'.
  parameterKey: string;
  // The environment without the key.
  target: StructureEnvironment;
  // The environments that have the key, in the configured order.
  sources: SourceEnvironment[];
  // The parameter open in the detail pane, when the menu is opened there.
  current?: SourceEnvironment;
  // Where "Enter a new value" takes the type, description and KMS key from.
  template: ParameterEntry;
  // The button that opens the menu.
  children: (open: boolean) => ReactElement;
}

// Sets a key that's missing in one environment: copied from an environment
// that has it, or typed into the new-parameter form.
const SetMissingMenu = ({
  service,
  parameterKey,
  target,
  sources,
  current,
  template,
  children
}: SetMissingMenuProps) => {
  const [open, setOpen] = useState(false);
  // Esc closes the menu before anything else.
  useEscape(() => setOpen(false), open);
  const { structure, delimiter } = useLocationContext();
  const path = pathOf(
    target.segment,
    service,
    parameterKey,
    structure,
    delimiter
  );
  // A type the app can't save, such as StringList, can't be copied from.
  const others = sources.filter(
    s => s.segment !== current?.segment && isEditableType(s.type)
  );
  const currentUnsupported = current && !isEditableType(current.type);
  const preselectTargets = [target.segment];

  const items = setMissingItems({
    target,
    path,
    current,
    currentUnsupported: !!currentUnsupported,
    others
  });

  const onClick: MenuProps['onClick'] = ({ key }) => {
    setOpen(false);
    if (key === 'current' && current && !currentUnsupported) {
      uiActions.openCopyDialog(current.name, { preselectTargets });
    }
    if (key === 'other') {
      uiActions.openCopyDialog(others[0]!.name, {
        preselectTargets,
        pickSource: true
      });
    }
    if (key === 'new') {
      uiActions.openNewParameter(
        missingValuePrefill(template, {
          service,
          env: target.segment,
          key: parameterKey
        })
      );
    }
  };

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      menu={{ items, onClick }}
      styles={{ root: { width: SET_MISSING_MENU_WIDTH } }}
    >
      <Tooltip title={open ? undefined : `Set a value in ${target.segment}`}>
        {children(open)}
      </Tooltip>
    </Dropdown>
  );
};

export default SetMissingMenu;
