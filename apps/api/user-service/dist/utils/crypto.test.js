"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("./crypto");
describe('Crypto Utils', () => {
    const testPassword = 'testPassword123';
    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const hash = await (0, crypto_1.hashPassword)(testPassword);
            expect(hash).toBeDefined();
            expect(hash).not.toBe(testPassword);
            expect(hash.length).toBeGreaterThan(50);
        });
        it('should generate different hashes for the same password', async () => {
            const hash1 = await (0, crypto_1.hashPassword)(testPassword);
            const hash2 = await (0, crypto_1.hashPassword)(testPassword);
            expect(hash1).not.toBe(hash2);
        });
    });
    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const hash = await (0, crypto_1.hashPassword)(testPassword);
            const isValid = await (0, crypto_1.verifyPassword)(testPassword, hash);
            expect(isValid).toBe(true);
        });
        it('should reject incorrect password', async () => {
            const hash = await (0, crypto_1.hashPassword)(testPassword);
            const isValid = await (0, crypto_1.verifyPassword)('wrongPassword', hash);
            expect(isValid).toBe(false);
        });
        it('should handle empty password', async () => {
            const hash = await (0, crypto_1.hashPassword)(testPassword);
            const isValid = await (0, crypto_1.verifyPassword)('', hash);
            expect(isValid).toBe(false);
        });
    });
});
