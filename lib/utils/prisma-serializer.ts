import { Decimal } from "@prisma/client/runtime/library";

/**
 * Recursively converts Prisma Decimal objects to plain JavaScript numbers
 * for safe JSON serialization in API routes.
 *
 * @param data - Any data structure that may contain Decimal fields
 * @returns The same structure with Decimals converted to numbers
 */
export function serializePrismaJson<T>(data: T): T {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Decimal objects
  if (data instanceof Decimal) {
    return data.toNumber() as T;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => serializePrismaJson(item)) as T;
  }

  // Handle plain objects
  if (typeof data === "object" && data.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializePrismaJson(value);
    }
    return result as T;
  }

  // Handle Date, string, number, boolean, and other primitives
  return data;
}
