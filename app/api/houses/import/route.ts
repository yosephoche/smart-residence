import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  parseSpreadsheet,
  validateImportStructure,
  normalizeImportRow,
} from "@/lib/utils/import";
import { bulkImportHouses } from "@/services/house.service";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const POST = auth(async (req) => {
  // Admin-only access
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload a CSV or XLSX file.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 5MB.",
        },
        { status: 400 }
      );
    }

    // Parse the spreadsheet
    let rows: Record<string, string>[];
    try {
      rows = await parseSpreadsheet(file);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Failed to parse file: ${error.message}`
              : "Failed to parse file",
        },
        { status: 400 }
      );
    }

    // Validate structure
    const structureValidation = validateImportStructure(rows);
    if (!structureValidation.valid) {
      return NextResponse.json(
        {
          error: "Invalid file structure",
          details: structureValidation.errors,
        },
        { status: 400 }
      );
    }

    // Normalize rows
    const normalizedRows = rows.map((row) => normalizeImportRow(row));

    // Bulk import
    const { created, errors } = await bulkImportHouses(normalizedRows);

    // Return response
    return NextResponse.json(
      {
        success: true,
        summary: {
          totalRows: normalizedRows.length,
          successCount: created.length,
          failureCount: errors.length,
        },
        errors,
        createdHouses: created,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import houses",
      },
      { status: 500 }
    );
  }
});
