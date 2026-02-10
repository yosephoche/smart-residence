/**
 * Import utility functions for parsing and validating CSV/XLSX files
 */

/**
 * Parse CSV/XLSX file and return raw rows
 */
export async function parseSpreadsheet(
  file: File
): Promise<Record<string, string>[]> {
  const xlsx = await import("xlsx");

  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer();

  // Parse workbook
  const workbook = xlsx.read(arrayBuffer, { type: "array" });

  // Get first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Spreadsheet has no sheets");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with headers
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, {
    raw: false, // Convert all values to strings
    defval: "", // Default empty cells to empty string
  });

  // Filter out completely empty rows
  const filteredRows = rows.filter((row) => {
    return Object.values(row).some((value) => value.trim() !== "");
  });

  // Trim all string values
  return filteredRows.map((row) => {
    const trimmedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      trimmedRow[key] = typeof value === "string" ? value.trim() : value;
    }
    return trimmedRow;
  });
}

/**
 * Validate that required columns exist in the spreadsheet
 */
export function validateImportStructure(
  rows: Record<string, string>[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    errors.push("File is empty or has no data rows");
    return { valid: false, errors };
  }

  const requiredColumns = ["houseNumber", "block", "houseTypeId"];
  const firstRow = rows[0];
  const actualColumns = Object.keys(firstRow);

  for (const column of requiredColumns) {
    if (!actualColumns.includes(column)) {
      errors.push(`Missing required column: ${column}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Normalize and clean row data
 */
export function normalizeImportRow(row: Record<string, string>): {
  houseNumber: string;
  block: string;
  houseTypeId: string;
  userId?: string;
} {
  return {
    houseNumber: row.houseNumber?.trim() || "",
    block: row.block?.trim() || "",
    houseTypeId: row.houseTypeId?.trim() || "",
    userId: row.userId?.trim() || undefined,
  };
}
