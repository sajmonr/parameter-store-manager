import { useEffect, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { Alert, Card, Checkbox, Flex, Form, Select, Typography } from 'antd';
import type { ListProfilesResponse } from '../../../main/endpoints/aws/listProfiles/listProfiles.contract';
import usePageVisible from '../../hooks/usePageVisible';
import { profilesService } from '../../services';
import { EXPORT_MUTATION_KEY } from '../../state/export';
import { useSettingsStore } from '../../state/settings';
import { AWS_REGIONS } from '../../utils/awsRegions';
import useSaveSettings from './useSaveSettings';
import styles from './Settings.module.css';

const regionOptions = (current: string) =>
  [...new Set([...AWS_REGIONS, current].filter(Boolean))]
    .sort()
    .map(region => ({ value: region, label: region }));

// The empty profile means the SDK default: AWS_PROFILE if set, otherwise the
// profile named "default". Without AWS_PROFILE the two are the same, so the
// empty profile is shown as "default"; with it, both are listed.
const profileOptions = (
  { profiles, envProfile }: ListProfilesResponse,
  current: string
) => {
  const sourceText = (name: string) => {
    const found = profiles.find(p => p.name === name);
    return found && `from ~/.aws/${found.source}`;
  };
  const names = profiles
    .map(p => p.name)
    .filter(name => envProfile || name !== 'default');
  if (current && !names.includes(current)) names.unshift(current);
  const sdkDefault = envProfile
    ? { value: '', name: 'SDK default', suffix: `AWS_PROFILE=${envProfile}` }
    : { value: '', name: 'default', suffix: sourceText('default') };
  return [
    sdkDefault,
    ...names.map(name => ({ value: name, name, suffix: sourceText(name) }))
  ].map(({ value, name, suffix }) => ({
    value,
    label: (
      <Flex justify="space-between" align="center" gap={8}>
        <span>{name}</span>
        {suffix && (
          <Typography.Text type="secondary" className={styles.suffix}>
            {suffix}
          </Typography.Text>
        )}
      </Flex>
    )
  }));
};

const AwsConnectionSection = () => {
  const saved = useSettingsStore();
  const save = useSaveSettings();
  const visible = usePageVisible();
  const exporting = useIsMutating({ mutationKey: EXPORT_MUTATION_KEY }) > 0;
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
        <Flex gap={12}>
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
