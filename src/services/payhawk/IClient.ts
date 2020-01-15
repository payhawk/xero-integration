import { IExpense } from './Expense';
import { IAccountCode } from './IAccountCode';
import { IBalanceTransfer } from './IBalanceTransfer';
import { IBusinessAccount } from './IBankAccount';
import { IDownloadedFile } from './IDownloadedFile';

export interface IClient {
    getExpense(expenseId: string): Promise<IExpense>;
    getTransfers(startDate: string, endDate: string): Promise<IBalanceTransfer[]>;
    synchronizeChartOfAccounts(accountCodes: IAccountCode[]): Promise<void>;
    synchronizeBankAccounts(accountCodes: IBusinessAccount[]): Promise<void>;
    downloadFiles(expense: IExpense): Promise<IDownloadedFile[]>;
}
