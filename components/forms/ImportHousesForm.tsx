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
    usersCreated: number;
    usersLinked: number;
    userErrorCount: number;
    houseTypesCreated: number;
    houseTypesLinked: number;
    houseTypeErrorCount: number;
  };
  errors: Array<{
    row: number;
    houseNumber: string;
    errors: string[];
  }>;
  userErrors: Array<{
    row: number;
    email: string;
    errors: string[];
  }>;
  houseTypeErrors: Array<{
    row: number;
    typeName: string;
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
              <div className="text-sm text-gray-600">Houses Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {result.summary.failureCount}
              </div>
              <div className="text-sm text-gray-600">Houses Failed</div>
            </div>
          </div>

          {/* House Types Summary */}
          {(result.summary.houseTypesCreated > 0 ||
            result.summary.houseTypesLinked > 0) && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                House Types
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {result.summary.houseTypesCreated}
                  </div>
                  <div className="text-xs text-gray-600">Created</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-teal-600">
                    {result.summary.houseTypesLinked}
                  </div>
                  <div className="text-xs text-gray-600">Linked Existing</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">
                    {result.summary.houseTypeErrorCount}
                  </div>
                  <div className="text-xs text-gray-600">Type Errors</div>
                </div>
              </div>
            </div>
          )}

          {/* User Accounts Summary */}
          {(result.summary.usersCreated > 0 ||
            result.summary.usersLinked > 0) && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                User Accounts
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">
                    {result.summary.usersCreated}
                  </div>
                  <div className="text-xs text-gray-600">Created</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-600">
                    {result.summary.usersLinked}
                  </div>
                  <div className="text-xs text-gray-600">Linked Existing</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-orange-600">
                    {result.summary.userErrorCount}
                  </div>
                  <div className="text-xs text-gray-600">User Errors</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success messages */}
        {result.summary.successCount > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            Successfully imported {result.summary.successCount} house
            {result.summary.successCount !== 1 ? "s" : ""}.
          </div>
        )}

        {result.summary.houseTypesCreated > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            Created {result.summary.houseTypesCreated} new house type
            {result.summary.houseTypesCreated !== 1 ? "s" : ""}.
          </div>
        )}

        {result.summary.houseTypesLinked > 0 && (
          <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded">
            Linked {result.summary.houseTypesLinked} house
            {result.summary.houseTypesLinked !== 1 ? "s" : ""} to existing house
            types.
          </div>
        )}

        {result.summary.usersCreated > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            Created {result.summary.usersCreated} new user account
            {result.summary.usersCreated !== 1 ? "s" : ""} with default
            password. Users will be prompted to change password on first login.
          </div>
        )}

        {result.summary.usersLinked > 0 && (
          <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded">
            Linked {result.summary.usersLinked} house
            {result.summary.usersLinked !== 1 ? "s" : ""} to existing user
            accounts.
          </div>
        )}

        {/* House Error table */}
        {result.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-700">
              House Errors ({result.errors.length})
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

        {/* House Type Errors table */}
        {result.houseTypeErrors && result.houseTypeErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-700">
              House Type Creation Errors ({result.houseTypeErrors.length})
            </h4>
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm">
              Note: Houses were NOT created for these rows due to house type
              errors.
            </div>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.houseTypeErrors.map((error, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.row}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.typeName}
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

        {/* User Errors table */}
        {result.userErrors && result.userErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-700">
              User Creation Errors ({result.userErrors.length})
            </h4>
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 rounded text-sm">
              Note: Houses were still created for these rows, but user accounts
              could not be created.
            </div>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.userErrors.map((error, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.row}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {error.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600">
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
            <strong>houseNumber</strong> - Required (e.g., &quot;S2-25&quot;)
          </li>
          <li>
            <strong>block</strong> - Required (e.g., &quot;Sakura 2&quot;)
          </li>
          <li>
            <strong>houseTypeId</strong> - Optional (provide houseTypeId OR
            type+price)
          </li>
          <li>
            <strong>type</strong> - Optional (house type name, e.g.,
            &quot;Ruko&quot;, &quot;Type 50&quot;)
          </li>
          <li>
            <strong>price</strong> - Optional (monthly fee in Rupiah, e.g.,
            50000)
          </li>
          <li>
            <strong>userId</strong> - Optional (leave empty if not assigned)
          </li>
          <li>
            <strong>name</strong> - Optional (user&apos;s full name for
            auto-creation)
          </li>
          <li>
            <strong>email</strong> - Optional (user&apos;s email for
            auto-creation)
          </li>
        </ul>

        <p className="text-sm text-blue-800 mt-3 font-semibold">
          Auto-Create House Types:
        </p>
        <p className="text-sm text-blue-800">
          If <strong>houseTypeId</strong> is empty but both <strong>type</strong>{" "}
          and <strong>price</strong> are provided, a house type will be
          automatically created (if type name doesn&apos;t exist) and used for
          the house. Existing types with the same name will be reused.
        </p>

        <p className="text-sm text-blue-800 mt-3 font-semibold">
          Auto-Create Users:
        </p>
        <p className="text-sm text-blue-800">
          If both <strong>name</strong> and <strong>email</strong> are provided,
          a user account will be automatically created (if email doesn&apos;t
          exist) and linked to the house. New users get the default password and
          must change it on first login.
        </p>

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
