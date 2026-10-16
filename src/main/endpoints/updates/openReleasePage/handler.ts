import { openReleasePage } from '../../../updates';
import { defineEndpoint } from '../../endpoint';
import { openReleasePageContract } from './openReleasePage.contract';

export default defineEndpoint(openReleasePageContract, () => openReleasePage());
