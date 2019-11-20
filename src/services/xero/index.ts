import { AccessToken } from 'xero-node/lib/internals/OAuth1HttpClient';

import { Auth } from './Auth';
import { Client } from './Client';
import { IAuth } from './IAuth';
import { IAccountingItemData, IClient, ICreateBillData, ICreateTransactionData, IUpdateBillData, IUpdateTransactionData } from './IClient';

export { IClient, IAccountingItemData, ICreateBillData, IUpdateBillData, ICreateTransactionData, IUpdateTransactionData, IAuth };
export { IAccountCode } from './IAccountCode';
export { IBankAccount } from './IBankAccount';
export { IAttachment } from './IAttachment';

export { AppType } from './Config';

export const createAuth = (accountId: string, returnUrl?: string): IAuth => {
    return new Auth(accountId, returnUrl);
};

export const createClient = (accountId: string, accessToken: AccessToken): IClient => {
    return new Client(accountId, accessToken);
};
