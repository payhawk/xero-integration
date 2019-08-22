import * as TypeMoq from 'typemoq';

import { AccessToken, RequestToken } from 'xero-node/lib/internals/OAuth1HttpClient';
import { IAuth } from '../../services/xero';
import { Manager } from './Manager';
import { IStore } from './store';

describe('xero-connection/Manager', () => {
    const accountId = 'account_id';
    let storeMock: TypeMoq.IMock<IStore>;
    let authMock: TypeMoq.IMock<IAuth>;
    let manager: Manager;

    beforeEach(() => {
        storeMock = TypeMoq.Mock.ofType<IStore>();
        authMock = TypeMoq.Mock.ofType<IAuth>();

        manager = new Manager(storeMock.object, authMock.object, accountId);
    });

    afterEach(() => {
        storeMock.verifyAll();
        authMock.verifyAll();
    });

    describe('getAuthorizationUrl', () => {
        test('saves request token and return url', async () => {
            const requestToken: RequestToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };
            const url = 'https://login at xero';

            authMock
                .setup(a => a.getAuthUrl())
                .returns(async () => ({ url, requestToken }));

            storeMock
                .setup(s => s.saveRequestToken(accountId, requestToken))
                .returns(() => Promise.resolve())
                .verifiable(TypeMoq.Times.once());

            const result = await manager.getAuthorizationUrl();

            expect(result).toEqual(url);
        });
    });

    describe('getAccessToken', () => {
        test('retrieves access token from store', async () => {
            const accessToken: AccessToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };

            storeMock
                .setup(s => s.getAccessTokenByAccountId(accountId))
                .returns(async () => accessToken);

            const result = await manager.getAccessToken();

            expect(result).toEqual(accessToken);
        });
    });

    describe('authenticate', () => {
        test('throws if called without verifier argument', async () => {
            try {
                await manager.authenticate('');
                fail();
            } catch (err) {
                expect(err).toBeDefined();
            }
        });

        test('returns false if there is no request token', async () => {
            storeMock
                .setup(s => s.getRequestTokenByAccountId(accountId))
                .returns(async () => undefined);

            const result = await manager.authenticate('verifier');

            expect(result).toEqual(false);
        });

        test('returns true and saves access token on success', async () => {
            const verifier = 'verifier';
            const requestToken: RequestToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };
            const accessToken: AccessToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };

            storeMock
                .setup(s => s.getRequestTokenByAccountId(accountId))
                .returns(async () => requestToken);

            authMock
                .setup(a => a.getAccessToken(requestToken, verifier))
                .returns(async () => accessToken);

            storeMock
                .setup(s => s.saveAccessToken(accountId, accessToken))
                .returns(() => Promise.resolve())
                .verifiable(TypeMoq.Times.once());

            const result = await manager.authenticate(verifier);

            expect(result).toBe(true);
        });

        test('returns false on XeroError', async () => {
            const verifier = 'verifier';
            const requestToken: RequestToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };

            storeMock
                .setup(s => s.getRequestTokenByAccountId(accountId))
                .returns(async () => requestToken);

            authMock
                .setup(a => a.getAccessToken(requestToken, verifier))
                .returns(() => Promise.reject({ name: 'XeroError' }));

            const result = await manager.authenticate(verifier);

            expect(result).toBe(false);
        });

        test('throws on unexpected auth error', async () => {
            const expectedError = new Error('unexpected');
            const verifier = 'verifier';
            const requestToken: RequestToken = { oauth_token: 'auth token', oauth_token_secret: 'secret' };

            storeMock
                .setup(s => s.getRequestTokenByAccountId(accountId))
                .returns(async () => requestToken);

            authMock
                .setup(a => a.getAccessToken(requestToken, verifier))
                .returns(() => Promise.reject(expectedError));

            try {
                await manager.authenticate(verifier);
                fail();
            } catch (err) {
                expect(err).toBe(expectedError);
            }
        });
    });
});