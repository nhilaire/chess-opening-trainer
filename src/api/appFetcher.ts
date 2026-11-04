// The app's fetcher: the openings API of the build variant (src/config/env: placeholder in git, private URL in
// prod, mock in e2e). Jest replaces this module (jest.setup.js) so that no test reaches the network.
import { OPENINGS_API_BASE_URL } from '../config/env';
import { httpFetcher } from './openingsClient';

export const appFetcher = httpFetcher(OPENINGS_API_BASE_URL);
