import { Flex } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import type { StructureEnvironment } from '../../../shared/structure';
import {
  DEFAULT_PARAMETER_TYPE,
  isEditableType
} from '../../../shared/parameterTypes';
import type { ParameterEntry } from '../../state/parameters';
import type { NewParameterPrefill } from '../../state/ui';
import EnvironmentDot from '../common/EnvironmentDot';
import Mono from '../common/Mono';
import ActionLabel from './ActionLabel';
import styles from './SetMissingMenu.module.css';

// An environment that has the key, with its name and type there.
export interface SourceEnvironment extends StructureEnvironment {
  name: string;
  type: string | undefined;
}

// The menu: a header naming the missing path, then copying from the open
// parameter, copying from another environment, and entering a new value.
export const setMissingItems = ({
  target,
  path,
  current,
  currentUnsupported,
  others
}: {
  target: StructureEnvironment;
  path: string;
  current?: SourceEnvironment;
  currentUnsupported: boolean;
  // The other environments whose value can be copied.
  others: SourceEnvironment[];
}): MenuProps['items'] => [
  {
    type: 'group',
    key: 'target',
    label: (
      <Flex
        component="span"
        vertical
        gap="var(--ant-margin-xxs)"
        className={styles.header}
      >
        <Flex
          component="span"
          align="center"
          gap="small"
          className={styles.env}
        >
          Set value in <EnvironmentDot color={target.color} />
          {target.segment}
        </Flex>
        <Mono size="small" ellipsis={{ tooltip: path }}>
          {path}
        </Mono>
      </Flex>
    )
  },
  { type: 'divider' },
  ...(current
    ? [
        {
          key: 'current',
          icon: <CopyOutlined />,
          label: (
            <ActionLabel
              title={
                <Flex
                  component="span"
                  align="center"
                  gap="small"
                  className={styles.env}
                >
                  Copy from <EnvironmentDot color={current.color} />
                  {current.segment}
                </Flex>
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

// The new-parameter form for the missing key: the template's type,
// description and KMS key, and an empty value to type.
export const missingValuePrefill = (
  template: ParameterEntry,
  target: { service: string; env: string; key: string }
): NewParameterPrefill => ({
  target,
  type: isEditableType(template.Type) ? template.Type : DEFAULT_PARAMETER_TYPE,
  description: template.Description ?? '',
  kmsKey: template.KeyId,
  value: '',
  focusValue: true
});
