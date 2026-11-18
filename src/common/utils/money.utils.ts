import { CURRENCY_MINOR_UNITS } from '../constants/currency.constants';

export class MoneyUtil {
  /**
   * Get the number of decimal places supported by a currency.
   *
   * NGN -> 2
   * JPY -> 0
   * KWD -> 3
   */
  static getMinorUnitDigits(currency: string): number {
    const normalizedCurrency = currency.trim().toUpperCase();

    const digits = CURRENCY_MINOR_UNITS[normalizedCurrency];

    if (digits === undefined) {
      throw new Error(`Unsupported currency: ${normalizedCurrency}`);
    }

    return digits;
  }

  /**
   * Convert major units to minor units.
   *
   * Example:
   * "1500.50" NGN -> 150050n
   * "100.500" KWD -> 100500n
   * "500" JPY -> 500n
   */
  static toMinorUnits(amount: string, currency: string): bigint {
    const digits = this.getMinorUnitDigits(currency);
    const normalized = amount.trim();

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      throw new Error('Invalid monetary amount.');
    }

    const isNegative = normalized.startsWith('-');
    const unsignedAmount = isNegative ? normalized.slice(1) : normalized;

    const [whole, fraction = ''] = unsignedAmount.split('.');

    if (fraction.length > digits) {
      throw new Error(
        `Maximum ${digits} decimal places allowed for ${currency}.`,
      );
    }

    const scale = 10n ** BigInt(digits);

    const fractionalPart = BigInt(fraction.padEnd(digits, '0') || '0');

    const minorUnits = BigInt(whole) * scale + fractionalPart;

    return isNegative ? -minorUnits : minorUnits;
  }

  /**
   * Convert minor units to a decimal major-unit string.
   *
   * Example:
   * 150050n NGN -> "1500.50"
   * 100500n KWD -> "100.500"
   * 500n JPY -> "500"
   */
  static toMajorUnits(amount: bigint, currency: string): string {
    const digits = this.getMinorUnitDigits(currency);

    if (digits === 0) {
      return amount.toString();
    }

    const scale = 10n ** BigInt(digits);
    const absoluteAmount = amount < 0n ? -amount : amount;

    const whole = absoluteAmount / scale;
    const fraction = absoluteAmount % scale;

    const formatted = `${whole}.${fraction.toString().padStart(digits, '0')}`;

    return amount < 0n ? `-${formatted}` : formatted;
  }

  /**
   * Add monetary amounts.
   */
  static add(...amounts: bigint[]): bigint {
    return amounts.reduce((total, amount) => total + amount, 0n);
  }

  /**
   * Subtract monetary amounts.
   */
  static subtract(amount: bigint, deduction: bigint): bigint {
    return amount - deduction;
  }

  /**
   * Multiply a monetary amount by a whole-number quantity.
   */
  static multiply(amount: bigint, quantity: number): bigint {
    if (!Number.isSafeInteger(quantity)) {
      throw new Error('Quantity must be a safe integer.');
    }

    return amount * BigInt(quantity);
  }

  /**
   * Compare two monetary amounts.
   */
  static compare(a: bigint, b: bigint): -1 | 0 | 1 {
    if (a < b) return -1;
    if (a > b) return 1;

    return 0;
  }

  /**
   * Calculate the sum of a collection of monetary amounts.
   */
  static sum(amounts: bigint[]): bigint {
    return this.add(...amounts);
  }

  /**
   * Check whether an amount is zero.
   */
  static isZero(amount: bigint): boolean {
    return amount === 0n;
  }

  /**
   * Check whether an amount is positive.
   */
  static isPositive(amount: bigint): boolean {
    return amount > 0n;
  }
}
