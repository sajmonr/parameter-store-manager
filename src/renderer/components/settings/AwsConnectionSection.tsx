import { useEffect, useState } from 'react';
import { Alert, Card, Checkbox, Flex, Form, Select } from 'antd';
import type { ListProfilesResponse } from '../../../main/endpoints/aws/listProfiles/listProfiles.contract';
import usePageVisible from '../../hooks/usePageVisible';
import { profilesService } from '../../services';
import { useExportStore } from '../../state/export';
import { useSettingsStore } from '../../state/settings';
import { profileChoices, regionOptions } from '../../utils/awsSettings';
import useSaveSettings from './useSaveSettings';
import styles from './Settings.module.css';
import MetaText from '../common/MetaText';

const profileOptions = (profiles: ListProfilesResponse, current: string) =>
  profileChoices(profiles, current).map(({ value, name, suffix }) => ({
    value,
    label: (
      <Flex justify="space-between" align="center" gap="small">
        <span>{name}</span>
        {suffix && <MetaText>{suffix}</MetaText>}
      </Flex>
    )
  }));

const AwsConnectionSection = () => {
  const saved = useSettingsStore();
  const save = useSaveSettings();
  const visible = usePageVisible();
  const exporting = useExportStore(state => state.running);
  const [profiles, setProfiles] = useState<ListProfilesResponse>({
    profiles: [],
    envProfile: null
  });
  // Not a setting: it decides what the KMS region is saved as. Unchecking it
  // saves nothing, so it can't be read back from the saved regions.
  const [kmsSame, setKmsSame] = useState(
    () => saved.kmsRegion === saved.ssmRegion
  );

  // Listed each time the page is shown: the page stays mounted, and profiles
  // may have been added to ~/.aws since.
  useEffect(() => {
    if (!visible) return;
    profilesService
      .list()
      .then(setProfiles)
      .catch(error => console.warn('Could not list AWS profiles:', error));
  }, [visible]);

  const onSsmRegionChange = (ssmRegion: string) =>
    save(kmsSame ? { ssmRegion, kmsRegion: ssmRegion } : { ssmRegion });

  // Checked only once the KMS region is saved to match.
  const onKmsSameChange = async (checked: boolean) => {
    if (checked && saved.kmsRegion !== saved.ssmRegion) {
      if (!(await save({ kmsRegion: saved.ssmRegion }))) return;
    }
    setKmsSame(checked);
  };

  return (
    <Card>
      <Form layout="vertical" className={styles.form}>
        {exporting && (
          <Form.Item>
            <Alert
              type="warning"
              showIcon
              title="An export is running"
              description="Changing the profile or region will stop it."
            />
          </Form.Item>
        )}
        <Form.Item label="Profile" htmlFor="settings-profile">
          <Select
            id="settings-profile"
            value={saved.profile}
            options={profileOptions(profiles, saved.profile)}
            onChange={(profile: string) => save({ profile })}
          />
        </Form.Item>
        <Flex gap="var(--ant-margin-sm)">
          <Form.Item
            label="SSM region"
            htmlFor="settings-ssm-region"
            className={styles.half}
          >
            <Select
              id="settings-ssm-region"
              showSearch
              value={saved.ssmRegion}
              options={regionOptions(saved.ssmRegion)}
              onChange={onSsmRegionChange}
            />
          </Form.Item>
          <Form.Item
            label="KMS region"
            htmlFor="settings-kms-region"
            className={styles.half}
          >
            <Select
              id="settings-kms-region"
              showSearch
              disabled={kmsSame}
              value={saved.kmsRegion}
              options={regionOptions(saved.kmsRegion)}
              onChange={(kmsRegion: string) => save({ kmsRegion })}
            />
          </Form.Item>
        </Flex>
        <Form.Item>
          <Checkbox
            checked={kmsSame}
            onChange={event => onKmsSameChange(event.target.checked)}
          >
            KMS region same as SSM
          </Checkbox>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AwsConnectionSection;
