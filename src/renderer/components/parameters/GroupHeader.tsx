import { Flex, theme, Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { GroupRow } from '../../utils/tableRows';
import { CountText } from '../common/MetaText';

// A service's header row in a whole environment's table, in the table's
// small text.
const GroupHeader = ({ row }: { row: GroupRow }) => {
  const { token } = theme.useToken();
  return (
    <Flex
      component="span"
      align="center"
      gap="small"
      style={{ fontSize: token.fontSizeSM }}
    >
      <AppstoreOutlined />
      <Typography.Text strong ellipsis style={{ fontSize: 'inherit' }}>
        {row.service}
      </Typography.Text>
      <CountText count={row.count} />
    </Flex>
  );
};

export default GroupHeader;
