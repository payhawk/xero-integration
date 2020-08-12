import * as TypeMoq from 'typemoq';
import { AccountingApi, Invoice, XeroClient } from 'xero-node';

import { ILogger, OperationNotAllowedError } from '../../../utils';
import { createXeroHttpClient } from '../http';
import { Client, escapeParam } from './Client';
import { BankTransactionType, ClientResponseStatus, CurrencyKeys, IBillPaymentData, ICreateBillData, ICreateTransactionData, IInvoice, InvoiceStatusCode, InvoiceType, LineAmountType } from './contracts';

const CURRENCY = 'GBP';

describe('Xero client', () => {
    const xeroClientMock = TypeMoq.Mock.ofType<AccountingApi>();
    const loggerMock = TypeMoq.Mock.ofType<ILogger>();
    const tenantId = '00000000-0000-0000-0000-000000000000';

    const client = new Client(createXeroHttpClient({ accountingApi: xeroClientMock.object } as XeroClient, loggerMock.object), tenantId, { sanitize: () => Promise.resolve() }, loggerMock.object);

    beforeEach(() => {
        xeroClientMock
            .setup(m => m.getCurrencies(
                tenantId,
                `${CurrencyKeys.code}=="${CURRENCY}"`
            ))
            .returns(async () => ({
                response: {
                    headers: {},
                },
                body: {
                    currencies: [{
                        code: CURRENCY,
                    }],
                },
            }) as any);
    });

    afterEach(() => {
        try {
            xeroClientMock.verifyAll();
        } finally {
            xeroClientMock.reset();
        }
    });

    describe('bank transactions', () => {
        it('should create spend bank transaction as tax inclusive with correct date string', async () => {
            const transaction = getSpendTransactionModel();

            const id = '1';

            xeroClientMock
                .setup(m => m.createBankTransactions(
                    tenantId,
                    {
                        bankTransactions: [{
                            bankTransactionID: undefined,
                            type: BankTransactionType.Spend as any,
                            bankAccount: {
                                accountID: transaction.bankAccountId,
                            },
                            reference: transaction.reference,
                            date: transaction.date,
                            url: transaction.url,
                            contact: {
                                contactID: transaction.contactId,
                            },
                            lineAmountTypes: LineAmountType.TaxInclusive as any,
                            lineItems: [
                                {
                                    description: transaction.description,
                                    accountCode: transaction.accountCode,
                                    quantity: 1,
                                    unitAmount: transaction.amount,
                                },
                            ],
                        },
                        ],
                    }))
                .returns(async () => {
                    return ({
                        response: {
                            headers: {},
                        },
                        body: {
                            bankTransactions: [
                                {
                                    statusAttributeString: ClientResponseStatus.Ok,
                                    bankTransactionID: id,
                                },
                            ],
                        },
                    }) as any;
                })
                .verifiable(TypeMoq.Times.once());

            const transactionId = await client.createTransaction(transaction);
            expect(transactionId).toEqual(id);
        });

        it('should create receive bank transaction with correct amount', async () => {
            const transaction = getReceiveTransactionModel();

            const id = '1';

            xeroClientMock
                .setup(m => m.createBankTransactions(
                    tenantId,
                    {
                        bankTransactions: [{
                            bankTransactionID: undefined,
                            type: BankTransactionType.Receive as any,
                            bankAccount: {
                                accountID: transaction.bankAccountId,
                            },
                            reference: transaction.reference,
                            date: transaction.date,
                            url: transaction.url,
                            contact: {
                                contactID: transaction.contactId,
                            },
                            lineAmountTypes: LineAmountType.TaxInclusive as any,
                            lineItems: [
                                {
                                    description: transaction.description,
                                    accountCode: transaction.accountCode,
                                    quantity: 1,
                                    unitAmount: Math.abs(transaction.amount),
                                },
                            ],
                        },
                        ],
                    }))
                .returns(async () => {
                    return ({
                        response: {
                            headers: {},
                        },
                        body: {
                            bankTransactions: [
                                {
                                    statusAttributeString: ClientResponseStatus.Ok,
                                    bankTransactionID: id,
                                },
                            ],
                        },
                    }) as any;
                })
                .verifiable(TypeMoq.Times.once());

            const transactionId = await client.createTransaction(transaction);
            expect(transactionId).toEqual(id);
        });

        it('should throw error', async () => {
            const transaction = getSpendTransactionModel();

            xeroClientMock
                .setup(m => m.createBankTransactions(
                    tenantId,
                    {
                        bankTransactions: [{
                            bankTransactionID: undefined,
                            type: BankTransactionType.Spend as any,
                            bankAccount: {
                                accountID: transaction.bankAccountId,
                            },
                            reference: transaction.reference,
                            date: transaction.date,
                            url: transaction.url,
                            contact: {
                                contactID: transaction.contactId,
                            },
                            lineAmountTypes: LineAmountType.TaxInclusive as any,
                            lineItems: [
                                {
                                    description: transaction.description,
                                    accountCode: transaction.accountCode,
                                    quantity: 1,
                                    unitAmount: transaction.amount,
                                },
                            ],
                        },
                        ],
                    }))
                .throws(({
                    response: {
                        body: {
                            Elements: [
                                {
                                    ValidationErrors: [
                                        {
                                            Message: 'Xero Error 1',
                                        },
                                        {
                                            Message: 'Xero Error 2',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    body: {},
                }) as any)
                .verifiable(TypeMoq.Times.once());

            let error: Error | undefined;
            try {
                await client.createTransaction(transaction);
            } catch (err) {
                error = err;
            }

            if (!error) {
                fail('Request did not error');
            }

            expect(error.message).toContain('Xero Error 1');
            expect(error.message).toContain('Xero Error 2');
        });
    });

    describe('invoices', () => {
        it('should create spend invoice as tax inclusive with correct date and due date strings', async () => {
            const invoice = getBillModel();

            const id = '1';

            xeroClientMock
                .setup(m => m.createInvoices(
                    tenantId,
                    {
                        invoices: [{
                            invoiceID: undefined,
                            dueDate: invoice.dueDate,
                            type: InvoiceType.AccountsPayable as any,
                            currencyCode: invoice.currency as any,
                            date: invoice.date,
                            url: invoice.url,
                            contact: {
                                contactID: invoice.contactId,
                            },
                            lineAmountTypes: LineAmountType.TaxInclusive as any,
                            lineItems: [
                                {
                                    description: invoice.description,
                                    accountCode: invoice.accountCode,
                                    quantity: 1,
                                    unitAmount: invoice.amount,
                                },
                            ],
                        },
                        ],
                    }))
                .returns(async () => ({
                    response: {
                        headers: {},
                    },
                    body: {
                        invoices: [
                            {
                                statusAttributeString: ClientResponseStatus.Ok,
                                invoiceID: id,
                            },
                        ],
                    },
                }) as any)
                .verifiable(TypeMoq.Times.once());

            const invoiceId = await client.createBill(invoice);
            expect(invoiceId).toEqual(id);
        });

        it('should throw error if invoice is already paid', async () => {
            const invoice = getBillModel(true);

            const id = '1';

            const existing: IInvoice = {
                invoiceID: id,
                status: InvoiceStatusCode.Paid as any,
            };

            await expect(client.updateBill({ ...invoice, billId: id }, existing)).rejects.toThrow(OperationNotAllowedError);
        });

        it('should throw error', async () => {
            const invoice = getBillModel();

            xeroClientMock
                .setup(m => m.createInvoices(
                    tenantId,
                    {
                        invoices: [{
                            invoiceID: undefined,
                            dueDate: invoice.dueDate,
                            type: InvoiceType.AccountsPayable as any,
                            currencyCode: invoice.currency as any,
                            date: invoice.date,
                            url: invoice.url,
                            contact: {
                                contactID: invoice.contactId,
                            },
                            lineAmountTypes: LineAmountType.TaxInclusive as any,
                            lineItems: [
                                {
                                    description: invoice.description,
                                    accountCode: invoice.accountCode,
                                    quantity: 1,
                                    unitAmount: invoice.amount,
                                },
                            ],
                        },
                        ],
                    }))
                .throws(({
                    body: {},
                    response: {
                        body: {
                            Elements: [
                                {
                                    StatusAttributeString: ClientResponseStatus.Error,
                                    ValidationErrors: [
                                        {
                                            Message: 'Xero Error 1',
                                        },
                                        {
                                            Message: 'Xero Error 2',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }) as any)
                .verifiable(TypeMoq.Times.once());

            let error: Error | undefined;
            try {
                await client.createBill(invoice);
            } catch (err) {
                error = err;
            }

            if (!error) {
                fail('Request did not error');
            }

            expect(error.message).toContain('Xero Error 1');
            expect(error.message).toContain('Xero Error 2');
        });
    });

    describe('payments', () => {
        it('should create a payment if bill is not yet paid', async () => {
            const paymentDetails: IBillPaymentData = {
                date: new Date().toISOString(),
                billId: '1',
                amount: 100,
                currency: CURRENCY,
                fxRate: 1,
                bankAccountId: 'bank_id',
            };

            const existingInvoice: IInvoice = {
                invoiceID: paymentDetails.billId,
                status: Invoice.StatusEnum.DRAFT,
            };

            xeroClientMock
                .setup(m => m.getInvoice(
                    tenantId,
                    paymentDetails.billId,
                ))
                .returns(async () => ({
                    response: {
                        headers: {},
                    },
                    body: { invoices: [existingInvoice] },
                }) as any);

            xeroClientMock
                .setup(m => m.createPayment(
                    tenantId,
                    {
                        date: paymentDetails.date,
                        invoice: {
                            invoiceID: paymentDetails.billId,
                        },
                        account: {
                            accountID: paymentDetails.bankAccountId,
                        },
                        amount: paymentDetails.amount,
                        currencyRate: paymentDetails.fxRate,
                    }))
                .returns(async () => ({
                    response: {
                        headers: {},
                    },
                    body: {
                        payments: [
                            {
                                statusAttributeString: ClientResponseStatus.Ok,
                                paymentID: '2',
                            },
                        ],
                    },
                }) as any)
                .verifiable(TypeMoq.Times.once());

            await client.payBill(paymentDetails);
        });

        it('throws error if bill is already paid', async () => {
            const paymentDetails: IBillPaymentData = {
                date: new Date().toISOString(),
                billId: '1',
                amount: 100,
                currency: CURRENCY,
                bankAccountId: 'bank_id',
            };

            xeroClientMock
                .setup(m => m.getInvoice(tenantId, paymentDetails.billId))
                .returns(async () => ({
                    response: {
                        headers: {},
                    },
                    body: {
                        invoices: [
                            {
                                statusAttributeString: ClientResponseStatus.Ok,
                                invoiceID: paymentDetails.billId,
                                status: InvoiceStatusCode.Paid,
                            },
                        ],
                    },
                }) as any)
                .verifiable(TypeMoq.Times.once());

            await expect(client.payBill(paymentDetails)).rejects.toThrow(OperationNotAllowedError);
        });
    });

    describe('escapeParam()', () => {
        it('should map to same value regardless of quotes and whitespace', () => {
            const expected = 'My Company Ltd.';
            expect(escapeParam('"My Company" Ltd.')).toEqual(expected);
            expect(escapeParam('"  My Company   " Ltd.')).toEqual(expected);
        });
    });

    function getSpendTransactionModel(): ICreateTransactionData {
        const transaction: ICreateTransactionData = {
            date: new Date(2012, 10, 10).toISOString(),
            bankAccountId: 'bank-account-id',
            contactId: 'contact-id',
            description: 'expense note',
            reference: 'tx description',
            amount: 12.05,
            accountCode: '310',
            url: 'expense url',
        };

        return transaction;
    }

    function getReceiveTransactionModel(): ICreateTransactionData {
        const transaction: ICreateTransactionData = {
            date: new Date(2012, 10, 10).toISOString(),
            bankAccountId: 'bank-account-id',
            contactId: 'contact-id',
            description: 'expense note',
            reference: 'tx description',
            amount: -12.05,
            accountCode: '310',
            url: 'expense url',
        };

        return transaction;
    }

    function getBillModel(isPaid?: boolean): ICreateBillData {
        const bill: ICreateBillData = {
            date: new Date(2012, 10, 10).toISOString(),
            dueDate: new Date(2012, 10, 20).toISOString(),
            isPaid,
            contactId: 'contact-id',
            currency: CURRENCY,
            description: 'expense note',
            amount: 12.05,
            accountCode: '310',
            url: 'expense url',
        };

        return bill;
    }
});
