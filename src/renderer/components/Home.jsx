import React, { Component } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Input,
  Layout,
  Spin,
  Table,
  Typography
} from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import ReactTimeAgo from 'react-time-ago';
import globToRegexp from 'glob-to-regexp';
import SearchTree from './SearchTree';
import {
  actions as parameterActions,
  selectors as parameterSelectors
} from '../ducks/parameters';
import CreationFormButton from './CreationFormButton';
import DeleteButton from './DeleteButton';
import { availableSettings, getSetting, onSettingChange } from '../settings';
import SettingsButton from './SettingsButton';

const { Paragraph } = Typography;
const { Search } = Input;

const { Content, Footer, Sider } = Layout;

class Home extends Component {
  static propTypes = {
    allParametersErrored: PropTypes.bool,
    allParametersLastUpdatedDate: PropTypes.instanceOf(Date),
    allParametersLoaded: PropTypes.bool,
    allParametersLoading: PropTypes.bool,
    deleteParameter: PropTypes.func.isRequired,
    fetchAllParameters: PropTypes.func.isRequired,
    parameters: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  static defaultProps = {
    allParametersErrored: false,
    allParametersLastUpdatedDate: null,
    allParametersLoaded: false,
    allParametersLoading: false
  };

  constructor(props) {
    super(props);
    const pathDelimiter = getSetting(availableSettings.pathDelimiter);

    this.unsubscribeStore = onSettingChange(
      availableSettings.pathDelimiter,
      (newValue, oldValue) => {
        if (newValue !== oldValue) this.setState({ pathDelimiter: newValue });
      }
    );

    this.state = {
      tableCursor: '',
      pathDelimiter
    };
  }

  componentDidMount() {
    const { fetchAllParameters } = this.props;
    fetchAllParameters();
  }

  componentWillUnmount() {
    this.unsubscribeStore();
  }

  stripTrailingPathDelimiter = str => {
    const { pathDelimiter } = this.state;
    if (str.substr(-1) === pathDelimiter) {
      return str.substr(0, str.length - 1);
    }
    return str;
  };

  onTreeSelect = keys => {
    // Deselecting a tree node passes no keys; that clears the filter.
    this.setState({
      tableCursor: this.stripTrailingPathDelimiter(keys[0] || '')
    });
  };

  onTableFilterChange = e => {
    this.setState({ tableCursor: e.target.value });
  };

  render() {
    const {
      parameters,
      allParametersLoaded,
      allParametersLoading,
      allParametersErrored,
      fetchAllParameters,
      allParametersLastUpdatedDate
    } = this.props;
    const { tableCursor, pathDelimiter } = this.state;
    const paramsToShowOnTable = tableCursor
      ? parameters.filter(param => {
          const reg = globToRegexp(`${tableCursor}*`);
          const d = reg.test(param.Name);
          return d;
        })
      : parameters;

    const columns = [
      {
        title: 'Name',
        dataIndex: 'Name',
        key: 'Name',
        width: 300,

        sorter: (a, b) => (a.Name < b.Name ? -1 : a.Name > b.Name ? 1 : 0),
        render: pathString => {
          const paths = pathString.split(pathDelimiter);
          const breadCrumbItems = paths.map((path, idx) => {
            const pathSoFar = paths.slice(0, idx + 1).join(pathDelimiter);

            // if last index
            if (idx === paths.length - 1) {
              return {
                key: pathString + idx,
                href: '#',
                title: (
                  <Paragraph strong copyable={{ text: pathString }}>
                    {path}
                  </Paragraph>
                )
              };
            }
            return {
              key: pathString + idx,
              href: '#',
              onClick: () => this.onTreeSelect([pathSoFar]),
              title: path
            };
          });

          return (
            <span style={{ wordBreak: 'break-word' }}>
              <Breadcrumb items={breadCrumbItems} />
            </span>
          );
        }
      },

      {
        title: 'Value',
        dataIndex: 'Value',
        key: 'Value',
        width: 300,

        render: value => (
          <Paragraph style={{ wordBreak: 'break-word' }} copyable>
            {value}
          </Paragraph>
        )
      },
      {
        title: 'Description',
        dataIndex: 'Description',
        key: 'Description',
        width: 250,
        render: value => {
          return value ? (
            <Paragraph style={{ wordBreak: 'break-word' }} copyable>
              {value}
            </Paragraph>
          ) : (
            <i>No Description</i>
          );
        }
      },
      {
        title: 'Type',
        dataIndex: 'Type',
        key: 'Type',
        width: 120
      },
      {
        title: 'LastModifiedDate',
        dataIndex: 'LastModifiedDate',
        key: 'LastModifiedDate',
        width: 220,
        sorter: (a, b) =>
          new Date(a.LastModifiedDate) - new Date(b.LastModifiedDate),
        render: date => (
          <span>
            {<ReactTimeAgo date={date} />} ({date.toLocaleString()})
          </span>
        )
      },
      {
        title: 'Actions',
        key: 'Actions',
        width: 100,
        fixed: 'right',
        render: e => {
          const currentData = {
            name: e.Name,
            description: e.Description,
            type: e.Type,
            value: e.Value,
            kmsKey: e.KeyId
          };
          const { deleteParameter } = this.props;
          return (
            <Layout>
              <CreationFormButton
                buttonText="Edit"
                modalText="Edit"
                initialFormData={currentData}
                resetOnClose
                editFlow
              />
              <CreationFormButton
                buttonType="primary"
                buttonText="Duplicate"
                initialFormData={currentData}
                resetOnClose
              />
              <DeleteButton name={e.Name} onDelete={deleteParameter} />
            </Layout>
          );
        }
      }
    ];

    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

    return (
      <Layout>
        <Content />
        <Content>
          <Layout style={{ background: '#fff' }}>
            <Sider
              width={300}
              style={{
                background: '#fff',
                overflow: 'auto',
                height: '100vh',
                left: 0
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    minHeight: '35px'
                  }}
                >
                  <SettingsButton />
                  <CreationFormButton
                    buttonType="primary"
                    style={{ flexGrow: 1, marginLeft: '20px' }}
                  />
                </div>
                {allParametersErrored || allParametersLoaded ? (
                  <SearchTree
                    data={parameters}
                    onTreeSelect={this.onTreeSelect}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flex: '1 1 auto'
                    }}
                  >
                    <Spin tip="Loading and building parameter tree...">
                      {/* antd shows the tip only when Spin wraps content. */}
                      <div style={{ padding: 50 }} />
                    </Spin>
                  </div>
                )}
              </div>
            </Sider>
            <Content style={{ minHeight: '100%', width: '100%' }}>
              <Alert
                message={
                  <div>
                    {' '}
                    Last fetched:{' '}
                    {allParametersLastUpdatedDate ? (
                      <ReactTimeAgo date={allParametersLastUpdatedDate} />
                    ) : (
                      'Never'
                    )}
                    <span style={{ marginLeft: '10px' }}>
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SyncOutlined />}
                        loading={allParametersLoading}
                        onClick={fetchAllParameters}
                      />
                    </span>
                  </div>
                }
                type="info"
              />
              <Search
                addonBefore={<span>Name filter. Supports globs (*, **).</span>}
                style={{ marginBottom: 8 }}
                placeholder="/services/**/Auth0"
                onChange={this.onTableFilterChange}
                value={tableCursor}
              />
              <Table
                dataSource={paramsToShowOnTable}
                rowKey="Name"
                columns={columns}
                // Every column has a width; scroll horizontally rather than squeeze one to 0px.
                scroll={{ x: tableWidth, y: 'calc(100vh - 200px)' }}
                loading={allParametersLoading}
                className="your-table"
              />
            </Content>
          </Layout>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Hopefully this helps</Footer>
      </Layout>
    );
  }
}

function mapStateToProps(state) {
  return {
    parameters: parameterSelectors.getAllParameters(state),
    allParametersLoaded: parameterSelectors.getIsAllParametersLoaded(state),
    allParametersLoading: parameterSelectors.getIsAllParametersLoading(state),
    allParametersErrored: parameterSelectors.getHasAllParametersErrored(state),
    allServiceNames: parameterSelectors.getAllServiceNames(state),
    allParametersLastUpdatedDate:
      parameterSelectors.getAllParametersLastUpdatedDate(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(parameterActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);
