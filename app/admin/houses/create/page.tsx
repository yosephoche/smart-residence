"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import HouseForm from "@/components/forms/HouseForm";
import { HouseFormData } from "@/lib/validations/house.schema";
import { HouseType, User } from "@/types";

export default function CreateHousePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseTypesRes, usersRes] = await Promise.all([
          fetch("/api/house-types"),
          fetch("/api/users"),
        ]);
        if (houseTypesRes.ok) {
          const houseTypesData = await houseTypesRes.json();
          setHouseTypes(houseTypesData);
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch {
        // silently handle
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleSubmit = async (data: HouseFormData) => {
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        houseNumber: data.houseNumber,
        block: data.block,
        houseTypeId: data.houseTypeId,
        userId: data.userId || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to create house");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/houses");
  };

  const handleCancel = () => {
    router.push("/admin/houses");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Add New House
        </h1>
        <p className="text-gray-600 mt-1">
          Register a new property in the residential area
        </p>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      <Card>
        <HouseForm
          houseTypes={houseTypes}
          users={users}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
