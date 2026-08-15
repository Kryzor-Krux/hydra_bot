import crypto from 'node:crypto';

const FIRST_NAMES = [
	'Valentina', 'Larissa', 'Camila', 'Alice', 'Julia',
	'Sophia', 'Isabella', 'Helena', 'Laura', 'Manuela',
	'Vitoria', 'Beatriz', 'Amanda', 'Mariana', 'Melissa',
	'Carolina', 'Gabriela', 'Luiza', 'Rafaela', 'Fernanda'
];

const SURNAMES = [
	'Nogueira', 'Almeida', 'Ribeiro', 'Silva', 'Santos',
	'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
	'Pereira', 'Lima', 'Gomes', 'Costa', 'Martins',
	'Carvalho', 'Araujo', 'Melo', 'Barbosa', 'Rocha'
];

export function generateName(): string {
	const firstName = FIRST_NAMES[crypto.randomInt(FIRST_NAMES.length)];
	const surname = SURNAMES[crypto.randomInt(SURNAMES.length)];
	
	const fullName = `${firstName} ${surname}`;
	// Extra validation/normalization just to be absolutely sure no accents sneak in
	return fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s]/g, "");
}

export function generatePassword(): string {
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';
	const symbols = '!@#$%&*()_+';
	
	let password = '';
	password += lowercase[crypto.randomInt(lowercase.length)];
	password += uppercase[crypto.randomInt(uppercase.length)];
	password += numbers[crypto.randomInt(numbers.length)];
	password += symbols[crypto.randomInt(symbols.length)];
	
	const allChars = lowercase + uppercase + numbers + symbols;
	for (let i = 0; i < 8; i++) {
		password += allChars[crypto.randomInt(allChars.length)];
	}
	
	// Shuffle the password
	return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

function calculateCPFCheckDigit(digits: number[]): number {
	const len = digits.length;
	let sum = 0;
	for (let i = 0; i < len; i++) {
		sum += digits[i] * (len + 1 - i);
	}
	const remainder = sum % 11;
	return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCPF(): string {
	while (true) {
		const baseDigits = Array.from({ length: 9 }, () => crypto.randomInt(10));
		
		// Ensure not all digits are the same
		const allSame = baseDigits.every(d => d === baseDigits[0]);
		if (allSame) continue;
		
		const digit1 = calculateCPFCheckDigit(baseDigits);
		const baseWithDigit1 = [...baseDigits, digit1];
		const digit2 = calculateCPFCheckDigit(baseWithDigit1);
		
		const cpf = [...baseWithDigit1, digit2].join('');
		if (validateCPF(cpf)) {
			return cpf;
		}
	}
}

export function validateCPF(cpf: string): boolean {
	cpf = cpf.replace(/[^\d]/g, '');
	if (cpf.length !== 11) return false;
	
	// Reject known invalid patterns
	if (/^(\d)\1{10}$/.test(cpf)) return false;
	
	const digits = cpf.split('').map(Number);
	
	const digit1 = calculateCPFCheckDigit(digits.slice(0, 9));
	if (digit1 !== digits[9]) return false;
	
	const digit2 = calculateCPFCheckDigit(digits.slice(0, 10));
	if (digit2 !== digits[10]) return false;
	
	return true;
}
