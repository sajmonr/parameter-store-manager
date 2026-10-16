import { Input, Tag, Tooltip } from 'antd';
import { FolderOutlined, SearchOutlined } from '@ant-design/icons';
import { usePathDelimiter } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { useMatcher } from '../../state/views';
import { shortFolder } from '../../utils/paths';
import styles from './SearchInput.module.css';

// One box for plain-text and glob search. The scoped folder shows as a tag
// inside the box; closing the tag searches all folders again.
const SearchInput = () => {
  const query = useUiStore(state => state.query);
  const scope = useUiStore(state => state.scope);
  const { isGlob } = useMatcher();
  const delimiter = usePathDelimiter();

  const scopeTag = scope && (
    <Tooltip title={scope}>
      <Tag
        color="blue"
        icon={<FolderOutlined />}
        closable
        className={styles.scope}
        onClose={event => {
          event.preventDefault();
          uiActions.setScope('');
        }}
      >
        {shortFolder(scope, delimiter)}
      </Tag>
    </Tooltip>
  );

  return (
    <Input
      className={isGlob ? `${styles.search} ${styles.glob}` : styles.search}
      aria-label="Search parameters"
      value={query}
      onChange={event => uiActions.setQuery(event.target.value)}
      allowClear
      prefix={
        <>
          <SearchOutlined className={styles.icon} />
          {scopeTag}
        </>
      }
      suffix={
        isGlob && (
          <Tooltip title="Glob mode: * matches within a segment, ** any depth">
            <Tag color="blue" className={styles.globTag}>
              glob
            </Tag>
          </Tooltip>
        )
      }
      placeholder={
        scope
          ? `Search this folder, or a glob like **${delimiter}Password`
          : `Search names, or a glob like ${delimiter}development${delimiter}**`
      }
    />
  );
};

export default SearchInput;
