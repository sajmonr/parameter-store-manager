import { Segmented } from 'antd';
import { ProjectOutlined, TableOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';

const options = [
  {
    value: 'table',
    label: 'Table',
    icon: <TableOutlined />,
    tooltip: 'Show one environment'
  },
  {
    value: 'compare',
    label: 'Compare',
    icon: <ProjectOutlined />,
    tooltip: 'Compare values across environments'
  }
];

// A service's table of one environment, or its environments side by side.
const ModeSwitch = ({ compare }: { compare: boolean }) => (
  <Segmented
    aria-label="Mode"
    options={options}
    value={compare ? 'compare' : 'table'}
    onChange={value => uiActions.setCompare(value === 'compare')}
  />
);

export default ModeSwitch;
