import { IEnvironment } from '@environment';
import { ILogger } from '@utils';

import { IHttpClient } from '../../http';
import { Client } from './Client';
import { IClient } from './contracts';

export * from './contracts';

export const create = (httpClient: IHttpClient, logger: ILogger, env: IEnvironment): IClient => {
    return new Client(httpClient, logger, env);
};
