import { config } from '../Config';
import { Integration, XeroConnection } from '../managers';
import { createLogger } from '../utils';
import { Controller } from './Controller';

export { Controller };

export const create = () => {
    const logger = createLogger();
    return new Controller(XeroConnection.createManager, Integration.createManager, config, logger);
};
