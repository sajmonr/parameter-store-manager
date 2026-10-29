import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Dropdown, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import type { StructureEnvironment } from '../../../shared/structure';
import { isEditableType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ParameterEntry } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { pathOf } from '../../utils/structure';
import useEscape from '../../hooks/useEscape';
import EnvironmentDot from '../common/EnvironmentDot';
import Mono from '../common/Mono';
import styles from './SetMissingMenu.module.css';

// An environment that has the key, with its name and type there.
export interface SourceEnvironment extends StructureEnvironment {
  name: string;
  type: string | undefined;
}

const ActionLabel = ({
  title,
  detail
}: {
  title: ReactNode;
  detail: string;
}) => (
  <span className={styles.action}>
    <span className={styles.actionTitle}>{title}</span>
    <Typography.Text type="secondary" className={styles.actionDetail}>
      {detail}
    </Typography.Text>
  </span>
);

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

  const header: ReactNode = (
    <span className={styles.header}>
      <span className={styles.env}>
        Set value in <EnvironmentDot color={target.color} />
        {target.segment}
      </span>
      <Mono size={12} ellipsis={{ tooltip: path }}>
        {path}
      </Mono>
    </span>
  );

  const items: MenuProps['items'] = [
    { type: 'group', key: 'target', label: header },
    { type: 'divider' },
    ...(current
      ? [
          {
            key: 'current',
            icon: <CopyOutlined />,
            label: (
              <ActionLabel
                title={
                  <span className={styles.env}>
                    Copy from <EnvironmentDot color={current.color} />
                    {current.segment}
                  </span>
                }
                detail={
                  currentUnsupported
                    ? `${current.type} values can't be copied yet`
                    : 'The value shown in this pane'
                }
              />
            ),
            disabled: currentUnsupported
          }
        ]
      : []),
    ...(others.length
      ? [
          {
            key: 'other',
            icon: <CopyOutlined />,
            label: (
              <ActionLabel
                title="Copy from another environment"
                detail={`Set in ${others.map(e => e.segment).join(', ')}`}
              />
            )
          }
        ]
      : []),
    {
      key: 'new',
      icon: <EditOutlined />,
      label: (
        <ActionLabel
          title="Enter a new value"
          detail="Opens the form with everything but the value filled in"
        />
      )
    }
  ];

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
      uiActions.openNewParameter({
        target: { service, env: target.segment, key: parameterKey },
        type: isEditableType(template.Type) ? template.Type : 'String',
        description: template.Description ?? '',
        kmsKey: template.KeyId,
        value: '',
        focusValue: true
      });
    }
  };

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      menu={{ items, onClick }}
      styles={{ root: { width: 300 } }}
    >
      <Tooltip title={open ? undefined : `Set a value in ${target.segment}`}>
        {children(open)}
      </Tooltip>
    </Dropdown>
  );
};

export default SetMissingMenu;
