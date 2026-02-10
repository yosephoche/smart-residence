"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface ImportHousesFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

interface ImportResult {
  summary: {
    totalRows: number;
    successCount: number;
    failureCount: number;
  };
  errors: Array<{
    row: number;
    houseNumber: string;
    errors: string[];
  }>;
}

export default function ImportHousesForm({
  onSuccess,
  onClose,
}: ImportHousesFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/houses/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import houses");
      }

      setResult(data);

      // If all rows succeeded, call onSuccess
      if (data.summary.failureCount === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import houses");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportAnother = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    if (result && result.summary.successCount > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  // If we have results, show them
  if (result) {
    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Import Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {result.summary.totalRows}
              </div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {result.summary.successCount}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {result.summary.failureCount}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>

        {/* Success message */}
        {result.summary.successCount > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            Successfully imported {result.summary.successCount} house
            {result.summary.successCount !== 1 ? "s" : ""}.
          </div>
        )}

        {/* Error table */}
        {result.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-700">
              Errors ({result.errors.length})
            </h4>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      House Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.errors.map((error, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.row}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.houseNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600">
                        <ul className="list-disc list-inside">
                          {error.errors.map((err, errIdx) => (
                            <li key={errIdx}>{err}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleImportAnother}>
            Import Another
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Upload form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File upload section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV or XLSX File
        </label>
        <input
          type="file"
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500 p-2"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: <span className="font-medium">{file.name}</span> (
            {(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">CSV Format</h4>
        <p className="text-sm text-blue-800 mb-2">
          Your file must include these columns:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>
            <strong>houseNumber</strong> - Required (e.g., "S2-25")
          </li>
          <li>
            <strong>block</strong> - Required (e.g., "Sakura 2")
          </li>
          <li>
            <strong>houseTypeId</strong> - Required (valid house type ID)
          </li>
          <li>
            <strong>userId</strong> - Optional (leave empty if not assigned)
          </li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          The <strong>id</strong> column will be ignored (auto-generated).
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!file || isSubmitting}
        >
          {isSubmitting ? "Importing..." : "Import"}
        </Button>
      </div>
    </form>
  );
}
