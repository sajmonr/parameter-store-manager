import { setSettings } from '../../../settings';
import { defineEndpoint } from '../../endpoint';
import { setSettingsContract } from './setSettings.contract';

export default defineEndpoint(setSettingsContract, values =>
  setSettings(values)
);
