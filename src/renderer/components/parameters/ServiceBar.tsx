import { Flex } from 'antd';
import { useEffect } from 'react';
import {
  useCompareMode,
  useEnvironmentTabs,
  useLocation
} from '../../state/views';
import type { Comparison } from '../../utils/compare';
import { isServiceLocation } from '../../utils/location';
import CompareFilterTabs from './CompareFilterTabs';
import EnvironmentTabs from './EnvironmentTabs';
import ModeSwitch from './ModeSwitch';
import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import styles from './ParameterBreadcrumb.module.css';
import { cx } from '../../utils/classNames';

// A service's second breadcrumb row: its environment tabs, or the compare
// filter while comparing, and the switch between the two. The tabs scroll
// sideways when they don't fit, fading out at a cut-off edge, and keep the
// selected one in view; the switch stays put.
const ServiceBar = ({ comparison }: { comparison: Comparison | null }) => {
  const location = useLocation();
  const tabs = useEnvironmentTabs();
  const compare = useCompareMode();
  const [scrollRef, overflow, scroller] = useHorizontalScroll(compare);
  const env = isServiceLocation(location) ? location.env : null;

  useEffect(() => {
    scroller
      ?.querySelector('.ant-segmented-item-selected')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [scroller, env, compare]);

  if (!isServiceLocation(location) || !tabs.length) return null;

  return (
    <Flex
      align="center"
      gap="var(--ant-margin-sm)"
      className={styles.serviceBar}
    >
      <Flex
        align="center"
        gap="var(--ant-margin-sm)"
        ref={scrollRef}
        className={cx(
          styles.tabs,
          overflow.start && styles.fadeStart,
          overflow.end && styles.fadeEnd
        )}
      >
        {compare && comparison ? (
          <CompareFilterTabs comparison={comparison} />
        ) : (
          <EnvironmentTabs tabs={tabs} env={location.env} />
        )}
      </Flex>
      <ModeSwitch compare={compare} />
    </Flex>
  );
};

export default ServiceBar;
