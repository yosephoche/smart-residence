"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import HouseTypeForm from "@/components/forms/HouseTypeForm";
import { HouseTypeFormData } from "@/lib/validations/houseType.schema";
import { HouseType, House } from "@/types";

export const dynamic = 'force-dynamic';

export default function EditHouseTypePage() {
  const t = useTranslations('house_types');
  const router = useRouter();
  const params = useParams();
  const typeId = params.id as string;

  const [houseType, setHouseType] = useState<HouseType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [housesUsingType, setHousesUsingType] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [houseTypeRes, housesRes] = await Promise.all([
          fetch(`/api/house-types/${typeId}`),
          fetch("/api/houses"),
        ]);

        if (houseTypeRes.ok) {
          const houseTypeData = await houseTypeRes.json();
          setHouseType(houseTypeData);
        } else {
          setNotFound(true);
        }

        if (housesRes.ok) {
          const housesData: House[] = await housesRes.json();
          const count = housesData.filter((h) => h.houseTypeId === typeId).length;
          setHousesUsingType(count);
        }
      } catch {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    loadData();
  }, [typeId]);

  const handleSubmit = async (data: HouseTypeFormData) => {
    if (!houseType) return;

    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/house-types/${houseType.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeName: data.typeName,
        price: data.price,
        description: data.description,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || t('update_error'));
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/house-types");
  };

  const handleCancel = () => {
    router.push("/admin/house-types");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-56 mt-2" />
        </div>
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
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
          title={t('not_found_title')}
          message={t('not_found_message')}
        />
        <button
          onClick={() => router.push("/admin/house-types")}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← {t('back_to_types')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push("/admin/house-types")}
          className="text-gray-600 hover:text-gray-900 font-medium mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('back_to_types')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t('edit_type')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('edit_subtitle', { typeName: houseType?.typeName ?? '' })}
        </p>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      {housesUsingType > 0 && (
        <Alert
          variant="info"
          title={t('houses_using_type')}
          message={t('houses_using_message', { count: housesUsingType })}
        />
      )}

      <Card>
        <HouseTypeForm
          houseType={houseType!}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
