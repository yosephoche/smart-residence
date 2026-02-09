"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import UserForm from "@/components/forms/UserForm";
import { UserFormData } from "@/lib/validations/user.schema";

export default function CreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data: UserFormData) => {
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, email: data.email, role: data.role, password: data.password }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to create user");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/users");
  };

  const handleCancel = () => {
    router.push("/admin/users");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create New User
        </h1>
        <p className="text-gray-600 mt-1">
          Add a new resident or administrator account
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      {/* Form Card */}
      <Card>
        <UserForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>

      {/* Info Box */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Default Password Policy
        </h3>
        <ul className="text-sm text-primary-800 space-y-1 ml-7">
          <li>• Default password is <code className="bg-primary-100 px-1.5 py-0.5 rounded font-mono">IPL2026</code></li>
          <li>• Users will be forced to change password on first login</li>
          <li>• New password must be at least 6 characters</li>
          <li>• Must contain uppercase, lowercase, or numbers</li>
        </ul>
      </div>
    </div>
  );
}
