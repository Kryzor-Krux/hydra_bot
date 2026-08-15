import { describe, it, expect } from 'vitest';
import { generateName, generatePassword, generateCPF, validateCPF } from './generator';

describe('Ciclos Domain Generator', () => {
	it('Name generation should have no accents and be FirstName LastName', () => {
		for (let i = 0; i < 50; i++) {
			const name = generateName();
			expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
			// Assert no accents
			expect(name.normalize("NFD")).toEqual(name);
			expect(name).not.toMatch(/[\u0300-\u036f]/);
		}
	});

	it('Password generation should meet complexity requirements', () => {
		for (let i = 0; i < 50; i++) {
			const password = generatePassword();
			expect(password.length).toBe(12);
			expect(password).toMatch(/[a-z]/);
			expect(password).toMatch(/[A-Z]/);
			expect(password).toMatch(/[0-9]/);
			expect(password).toMatch(/[!@#$%&*()_+]/);
		}
	});

	it('CPF generation should be exactly 11 digits and valid', () => {
		for (let i = 0; i < 50; i++) {
			const cpf = generateCPF();
			expect(cpf).toMatch(/^\d{11}$/);
			expect(validateCPF(cpf)).toBe(true);
			expect(cpf).not.toMatch(/^(\d)\1{10}$/);
		}
	});

	it('validateCPF should reject invalid CPFs', () => {
		expect(validateCPF('11111111111')).toBe(false);
		expect(validateCPF('12345678900')).toBe(false); // Invalid check digits
		expect(validateCPF('00000000000')).toBe(false);
	});
});
