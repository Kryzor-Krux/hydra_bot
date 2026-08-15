export function parseMoneyToCents(amountStr: string): number {
	if (!/^-?\d+(\.\d{1,2})?$/.test(amountStr)) {
		throw new Error('Invalid amount format');
	}

	const isNegative = amountStr.startsWith('-');
	const cleanStr = isNegative ? amountStr.substring(1) : amountStr;

	const parts = cleanStr.split('.');
	const reais = parseInt(parts[0] || '0', 10);

	let cents = 0;
	if (parts.length > 1) {
		const decimalPart = parts[1];
		if (decimalPart.length === 1) {
			cents = parseInt(decimalPart + '0', 10);
		} else {
			cents = parseInt(decimalPart, 10);
		}
	}

	const totalCents = reais * 100 + cents;
	return isNegative ? -totalCents : totalCents;
}

export function formatCents(cents: number): string {
	const isNegative = cents < 0;
	const absCents = Math.abs(cents);

	const reais = Math.floor(absCents / 100);
	const remainder = absCents % 100;

	const formatted = `${reais}.${remainder.toString().padStart(2, '0')}`;
	return isNegative ? `-${formatted}` : formatted;
}
