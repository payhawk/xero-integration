import { IBankAccount } from './IBankAccount';

export interface IManager {
    get(): Promise<IBankAccount[]>;
    getById(bankAccountId: string): Promise<IBankAccount | undefined>;
    getOrCreateByCurrency(currency: string): Promise<IBankAccount>;
    getCurrencyByBankAccountCode(bankAccountCode: string): Promise<string | undefined>;
}

const DEFAULT_SORT_CODE = '000000';

export const defBankAccountNumber = (currency: string) => `${DEFAULT_SORT_CODE}-PAYHAWK-${currency}`;
// cspell:disable-next-line
export const defBankAccountCode = (currency: string) => `PHWK-${currency}`;
export const defBankAccountName = (currency: string) => `Payhawk ${currency}`;
