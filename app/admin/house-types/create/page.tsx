"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import HouseTypeForm from "@/components/forms/HouseTypeForm";
import { HouseTypeFormData } from "@/lib/validations/houseType.schema";

export default function CreateHouseTypePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data: HouseTypeFormData) => {
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/house-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeName: data.typeName, price: data.price, description: data.description }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to create house type");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/house-types");
  };

  const handleCancel = () => {
    router.push("/admin/house-types");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Add New House Type
        </h1>
        <p className="text-gray-600 mt-1">
          Create a new house type with pricing information
        </p>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      <Card>
        <HouseTypeForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>

      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          House Type Guidelines
        </h3>
        <ul className="text-sm text-primary-800 space-y-1 ml-7">
          <li>• Type names should be descriptive (e.g., Tipe 36, Tipe 45, Tipe 60)</li>
          <li>• Set monthly IPL rates in Indonesian Rupiah</li>
          <li>• Add descriptions to help residents understand the house type</li>
          <li>• Pricing can be edited later if rates change</li>
        </ul>
      </div>
    </div>
  );
}
