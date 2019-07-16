import * as fs from 'fs';
import * as mime from 'mime-types';
import * as os from 'os';
import * as path from 'path';
import * as request from 'request-promise';
import * as uuid from 'uuid/v4';

import { config } from '../../Config';
import { IExpense, IFile } from './Expense';
import { IAccountCode } from './IAccountCode';
import { IClient } from './IClient';
import { IDownloadedFile } from './IDownloadedFile';

export class Client implements IClient {
    private readonly headers: { [key: string]: string };

    constructor(private readonly accountId: string, apiKey: string) {
        this.headers = {
            'X-Payhawk-ApiKey': apiKey,
        };
    }

    async getExpense(expenseId: string): Promise<IExpense> {
        const result = await request(`${config.payhawkUrl}/api/v2/accounts/${encodeURIComponent(this.accountId)}/expenses/${encodeURIComponent(expenseId)}`, {
            method: 'GET', json: true, headers: this.headers,
        });

        return result;
    }

    async synchronizeChartOfAccounts(accountCodes: IAccountCode[]) {
        await request(`${config.payhawkUrl}/api/v2/accounts/${encodeURIComponent(this.accountId)}/accounting-codes`, {
            method: 'PUT', json: accountCodes, headers: this.headers,
        });
    }

    async downloadFiles(expense: IExpense): Promise<IDownloadedFile[]> {
        if (!expense.document) {
            return [];
        }

        return await Promise.all(expense.document.files.map(async (f: IFile): Promise<IDownloadedFile> => {
            const extension = mime.extension(f.contentType) || 'jpg';
            const filePath = path.join(os.tmpdir(), uuid() + '.' + extension);
            const file = fs.createWriteStream(filePath);

            await new Promise((resolve, reject) => {
                request({
                    uri: f.url,
                })
                .pipe(file)
                .on('finish', () => resolve())
                .on('error', (error) => reject(error));
            });

            return {
                contentType: f.contentType,
                path: filePath,
            };
        }));
    }
}
