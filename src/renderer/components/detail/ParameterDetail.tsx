import { useState } from 'react';
import { Alert, Flex, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { ParameterEntry } from '../../state/parameters';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { useParameterPlace } from '../../state/views';
import { folderOf, leafOf } from '../../utils/paths';
import { layoutPattern } from '../../utils/structure';
import useEscape from '../../hooks/useEscape';
import BreakablePath from '../common/BreakablePath';
import Mono from '../common/Mono';
import ParameterTypeTag from '../common/ParameterTypeTag';
import PaneHeader from './PaneHeader';
import DetailActions from './DetailActions';
import ValueWell from './ValueWell';
import ValueEditor from './ValueEditor';
import ParameterMeta from './ParameterMeta';
import EnvironmentChips from './EnvironmentChips';
import { isSecure } from '../../../shared/parameterTypes';
import { OTHER_PATHS_LABEL } from '../../utils/labels';

// The selected parameter. Rendered with key={name}, so editing and the
// revealed value reset when the selection changes. With the structure on, it
// shows the parameter's service and environment and the service's other
// environments, or why it's under Other paths.
const ParameterDetail = ({ parameter }: { parameter: ParameterEntry }) => {
  const delimiter = usePathDelimiter();
  const structure = useSettingsStore(settings => settings.structure);
  const place = useParameterPlace(parameter.Name);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEscape(() => setEditing(false), editing);

  const keyFolder = place && folderOf(place.key, delimiter);

  return (
    <>
      <PaneHeader>
        <Flex align="center" gap="small" wrap>
          <Mono size="large" weight={600} style={{ wordBreak: 'break-all' }}>
            {leafOf(parameter.Name, delimiter)}
          </Mono>
          <ParameterTypeTag type={parameter.Type} />
        </Flex>
        {place && (
          <Flex
            align="center"
            gap="small"
            wrap
            style={{ margin: 'var(--ant-margin-xs) 0 var(--ant-margin-xxs)' }}
          >
            <Tag color="blue" icon={<AppstoreOutlined />}>
              {place.service}
            </Tag>
            <Tag color={place.color}>{place.env}</Tag>
            {keyFolder && (
              <Mono type="secondary" size="small">
                {keyFolder}
              </Mono>
            )}
          </Flex>
        )}
        <Mono type="secondary" size="small" copyable={{ text: parameter.Name }}>
          <BreakablePath path={parameter.Name} delimiter={delimiter} />
        </Mono>
      </PaneHeader>
      {editing ? (
        <ValueEditor parameter={parameter} onDone={() => setEditing(false)} />
      ) : (
        <>
          <DetailActions
            parameter={parameter}
            onEdit={() => setEditing(true)}
          />
          <ValueWell
            value={parameter.Value}
            secure={isSecure(parameter)}
            revealed={revealed}
            onToggleReveal={() => setRevealed(r => !r)}
          />
        </>
      )}
      <ParameterMeta
        parameter={parameter}
        environments={
          place && (
            <EnvironmentChips
              chips={place.environments}
              parameter={parameter}
              service={place.service}
              parameterKey={place.key}
            />
          )
        }
      />
      {structure.enabled && !place && (
        <Alert
          type="info"
          showIcon
          title={`This path doesn't match ${layoutPattern(structure.layout, delimiter)}, so it's listed under ${OTHER_PATHS_LABEL}.`}
        />
      )}
    </>
  );
};

export default ParameterDetail;
