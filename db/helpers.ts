import { createId } from '@paralleldrive/cuid2';
import { Decimal } from 'decimal.js';
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type DecimalInput = Decimal.Value | { toString(): string };

export const newId = () => createId();

export const now = () => new Date();

function decimalInputValue(value: DecimalInput): Decimal.Value {
  if (value instanceof Decimal || typeof value !== 'object') {
    return value;
  }

  return value.toString();
}

export function toDecimal(value: DecimalInput): Decimal;
export function toDecimal(value: DecimalInput | null | undefined): Decimal | null;
export function toDecimal(value: DecimalInput | null | undefined): Decimal | null {
  return value == null ? null : new Decimal(decimalInputValue(value));
}

export const fromDecimal = (value: DecimalInput) => new Decimal(decimalInputValue(value)).toFixed();

export const creditIncrement = (column: SQLWrapper, amount: DecimalInput): SQL<string> =>
  sql`${column} + ${fromDecimal(amount)}`;
