import { getAllSettings } from '../../../settings';
import { defineEndpoint } from '../../endpoint';
import { getSettingsContract } from './getSettings.contract';

export default defineEndpoint(getSettingsContract, () => getAllSettings());
