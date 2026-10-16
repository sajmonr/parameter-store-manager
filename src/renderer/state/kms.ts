import { useQuery } from '@tanstack/react-query';
import * as api from '../clients/api';
import { useSettingsStore } from './settings';

const listKmsAliases = () =>
  api.listKmsAliases().catch(error => {
    console.error('Something went wrong while fetching KMS Keys.', error);
    throw error;
  });

// The KMS aliases of the current profile and KMS region. Loaded the first
// time a form needs them and kept for the session; after a failure, the next
// form tries again.
export const useKmsAliases = () => {
  const profile = useSettingsStore(settings => settings.profile);
  const region = useSettingsStore(settings => settings.kmsRegion);
  return useQuery({
    queryKey: ['kmsAliases', profile, region],
    queryFn: listKmsAliases,
    gcTime: Infinity,
    retryOnMount: true
  });
};
