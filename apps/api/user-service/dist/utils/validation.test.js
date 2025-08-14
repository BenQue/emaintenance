"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("./validation");
const database_1 = require("@emaintenance/database");
describe('Validation Schemas', () => {
    describe('registerSchema', () => {
        const validData = {
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
        };
        it('should validate valid registration data', () => {
            const result = validation_1.registerSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should validate with optional fields', () => {
            const dataWithOptionals = {
                ...validData,
                employeeId: 'EMP001',
                role: database_1.UserRole.TECHNICIAN,
            };
            const result = validation_1.registerSchema.safeParse(dataWithOptionals);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.employeeId).toBe('EMP001');
                expect(result.data.role).toBe(database_1.UserRole.TECHNICIAN);
            }
        });
        it('should reject invalid email', () => {
            const result = validation_1.registerSchema.safeParse({
                ...validData,
                email: 'invalid-email',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('Invalid email format');
            }
        });
        it('should reject short username', () => {
            const result = validation_1.registerSchema.safeParse({
                ...validData,
                username: 'ab',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('at least 3 characters');
            }
        });
        it('should reject short password', () => {
            const result = validation_1.registerSchema.safeParse({
                ...validData,
                password: '1234567',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('at least 8 characters');
            }
        });
        it('should reject empty required fields', () => {
            const result = validation_1.registerSchema.safeParse({
                ...validData,
                firstName: '',
            });
            expect(result.success).toBe(false);
        });
    });
    describe('loginSchema', () => {
        const validData = {
            identifier: 'test@example.com',
            password: 'password123',
        };
        it('should validate valid login data', () => {
            const result = validation_1.loginSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
        it('should accept username as identifier', () => {
            const result = validation_1.loginSchema.safeParse({
                ...validData,
                identifier: 'testuser',
            });
            expect(result.success).toBe(true);
        });
        it('should reject empty identifier', () => {
            const result = validation_1.loginSchema.safeParse({
                ...validData,
                identifier: '',
            });
            expect(result.success).toBe(false);
        });
        it('should reject empty password', () => {
            const result = validation_1.loginSchema.safeParse({
                ...validData,
                password: '',
            });
            expect(result.success).toBe(false);
        });
        it('should reject missing fields', () => {
            const result = validation_1.loginSchema.safeParse({});
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors).toHaveLength(2); // identifier and password
            }
        });
    });
});
