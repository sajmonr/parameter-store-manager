import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Flex, Typography } from 'antd';
import { usePathDelimiter } from '../../state/settings';
import { leafOf } from '../../utils/paths';
import useEscape from '../../hooks/useEscape';
import BreakablePath from '../common/BreakablePath';
import Mono from '../common/Mono';
import ParameterTypeTag from '../common/ParameterTypeTag';
import PaneHeader from './PaneHeader';
import DetailActions from './DetailActions';
import ValueWell from './ValueWell';
import ValueEditor from './ValueEditor';
import ParameterMeta from './ParameterMeta';

// The selected parameter. Rendered with key={name}, so editing and the
// revealed value reset when the selection changes.
const ParameterDetail = ({ parameter }) => {
  const delimiter = usePathDelimiter();
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEscape(() => setEditing(false), editing);

  return (
    <>
      <PaneHeader>
        <Flex align="center" gap={8} wrap>
          <Mono size={18} weight={600} style={{ wordBreak: 'break-all' }}>
            {leafOf(parameter.Name, delimiter)}
          </Mono>
          <ParameterTypeTag type={parameter.Type} />
        </Flex>
        <Typography.Text
          type="secondary"
          copyable={{ text: parameter.Name }}
          style={{ fontFamily: 'var(--ant-font-family-code)', fontSize: 12 }}
        >
          <BreakablePath path={parameter.Name} delimiter={delimiter} />
        </Typography.Text>
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
            secure={parameter.Type === 'SecureString'}
            revealed={revealed}
            onToggleReveal={() => setRevealed(r => !r)}
          />
        </>
      )}
      <ParameterMeta parameter={parameter} />
    </>
  );
};

ParameterDetail.propTypes = {
  parameter: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    Type: PropTypes.string.isRequired,
    Value: PropTypes.string
  }).isRequired
};

export default ParameterDetail;
