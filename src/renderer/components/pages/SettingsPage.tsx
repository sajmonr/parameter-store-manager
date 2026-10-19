import type { ComponentType, ReactNode } from 'react';
import { Menu, Typography } from 'antd';
import {
  AppstoreOutlined,
  BgColorsOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { uiActions, useUiStore } from '../../state/ui';
import type { SettingsSection } from '../../state/ui';
import AwsConnectionSection from '../settings/AwsConnectionSection';
import DisplaySection from '../settings/DisplaySection';
import ServicesSection from '../settings/ServicesSection';
import PageHeading from './PageHeading';
import pageStyles from './Page.module.css';
import styles from './SettingsPage.module.css';

interface SectionInfo {
  key: SettingsSection;
  label: string;
  icon: ReactNode;
  description: string;
  Content: ComponentType;
}

// The sections are split for the reader, whatever the settings file's
// layout.
const sections: SectionInfo[] = [
  {
    key: 'aws',
    label: 'AWS connection',
    icon: <CloudOutlined />,
    description: 'Which account and region the app reads from.',
    Content: AwsConnectionSection
  },
  {
    key: 'services',
    label: 'Services & environments',
    icon: <AppstoreOutlined />,
    description: 'How parameter paths name a service and an environment.',
    Content: ServicesSection
  },
  {
    key: 'display',
    label: 'Display',
    icon: <BgColorsOutlined />,
    description: 'How parameters are shown and how the app looks.',
    Content: DisplaySection
  }
];

const menuItems = sections.map(({ key, label, icon }) => ({
  key,
  label,
  icon
}));

const SettingsPage = () => {
  const current = useUiStore(state => state.settingsSection);

  return (
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label="Settings sections">
        <Typography.Title level={4} className={styles.title}>
          Settings
        </Typography.Title>
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[current]}
          onClick={({ key }) =>
            uiActions.showSettingsSection(key as SettingsSection)
          }
          // The column draws the border, not the menu.
          styles={{ root: { borderInlineEnd: 'none' } }}
        />
      </nav>
      <div className={`${pageStyles.scroll} ${styles.main}`}>
        <div className={pageStyles.content} style={{ maxWidth: 680 }}>
          {/* All sections stay mounted, so each keeps its local state. */}
          {sections.map(({ key, label, description, Content }) => (
            <section key={key} hidden={key !== current}>
              <PageHeading title={label} description={description} />
              <Content />
            </section>
          ))}
          <Typography.Text type="secondary" className={styles.footer}>
            Changes are saved automatically.
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
