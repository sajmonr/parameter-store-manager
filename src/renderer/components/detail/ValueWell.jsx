import React from 'react';
import PropTypes from 'prop-types';
import { Flex } from 'antd';
import MaskedValue from '../common/MaskedValue';
import RevealButton from '../common/RevealButton';
import CopyButton from '../common/CopyButton';
import styles from './ValueWell.module.css';

// The full value in a dark well, with Reveal/Hide and Copy at the bottom.
const ValueWell = ({ value, secure, revealed, onToggleReveal }) => (
  <div className={styles.well}>
    <MaskedValue
      value={value}
      secure={secure}
      revealed={revealed}
      size={13}
      className={styles.value}
    />
    <Flex gap={4} className={styles.actions}>
      {secure && (
        <RevealButton revealed={revealed} onToggle={onToggleReveal} withLabel />
      )}
      <CopyButton text={value} label="Copy" />
    </Flex>
  </div>
);

ValueWell.propTypes = {
  onToggleReveal: PropTypes.func.isRequired,
  revealed: PropTypes.bool,
  secure: PropTypes.bool,
  value: PropTypes.string
};

export default ValueWell;
