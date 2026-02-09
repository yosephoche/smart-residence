"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import HouseForm from "@/components/forms/HouseForm";
import { HouseFormData } from "@/lib/validations/house.schema";
import { House, HouseType, User } from "@/types";

export default function EditHousePage() {
  const router = useRouter();
  const params = useParams();
  const houseId = params.id as string;

  const [house, setHouse] = useState<House | null>(null);
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseRes, houseTypesRes, usersRes] = await Promise.all([
          fetch(`/api/houses/${houseId}`),
          fetch("/api/house-types"),
          fetch("/api/users"),
        ]);

        if (houseRes.ok) {
          const houseData = await houseRes.json();
          setHouse(houseData);
        } else {
          setNotFound(true);
        }

        if (houseTypesRes.ok) {
          const houseTypesData = await houseTypesRes.json();
          setHouseTypes(houseTypesData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    loadData();
  }, [houseId]);

  const handleSubmit = async (data: HouseFormData) => {
    if (!house) return;

    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/houses/${house.id}`, {
      method: "PUT",
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
      setError(err.error || "Failed to update house");
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
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-56 mt-2" />
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

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert
          variant="error"
          title="House Not Found"
          message="The house you're trying to edit doesn't exist."
        />
        <button
          onClick={() => router.push("/admin/houses")}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Houses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push("/admin/houses")}
          className="text-gray-600 hover:text-gray-900 font-medium mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Houses
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Edit House
        </h1>
        <p className="text-gray-600 mt-1">
          Update house information for {house?.houseNumber}
        </p>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      <Card>
        <HouseForm
          house={house!}
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
