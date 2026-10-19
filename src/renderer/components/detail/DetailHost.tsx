import { Drawer } from 'antd';
import { useParameters } from '../../state/parameters';
import { uiActions, useUiStore } from '../../state/ui';
import { useSelectedParameter } from '../../state/views';
import useEscape from '../../hooks/useEscape';
import usePageVisible from '../../hooks/usePageVisible';
import ParameterDetail from './ParameterDetail';
import ParameterForm from '../form/ParameterForm';
import styles from './DetailHost.module.css';

// Hosts the selected parameter or the new-parameter form: docked on the
// right in a wide window, as a drawer in a narrow one. Not rendered at all
// while nothing is open. The drawer is a portal over the whole window, so it
// closes while its page is hidden and reopens, with its contents, after.
const DetailHost = ({ narrow }: { narrow: boolean }) => {
  const pageVisible = usePageVisible();
  const { loadState } = useParameters();
  const paneMode = useUiStore(state => state.paneMode);
  const parameter = useSelectedParameter();
  const prefill = useUiStore(state => state.newPrefill);

  const close = uiActions.closePane;

  let content = null;
  if (paneMode === 'detail' && parameter && loadState === 'ready') {
    content = <ParameterDetail key={parameter.Name} parameter={parameter} />;
  } else if (
    paneMode === 'new' &&
    (loadState === 'ready' || loadState === 'empty')
  ) {
    // A new prefill (another Duplicate) starts a fresh form.
    content = <ParameterForm key={JSON.stringify(prefill)} prefill={prefill} />;
  }

  useEscape(close, !!content);

  if (narrow) {
    return (
      <Drawer
        open={!!content && pageVisible}
        onClose={close}
        placement="right"
        size={420}
        closable={false}
        keyboard={false}
        styles={{ body: { padding: 0 } }}
      >
        {content && <div className={styles.content}>{content}</div>}
      </Drawer>
    );
  }

  return (
    content && (
      <aside className={styles.pane} aria-label="Details">
        {content}
      </aside>
    )
  );
};

export default DetailHost;
