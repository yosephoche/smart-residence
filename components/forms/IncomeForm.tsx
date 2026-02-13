"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { getIncomeCategoryOptions } from "@/lib/calculations";

interface Props {
  onSubmit: (data: IncomeFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: any;
}

export interface IncomeFormData {
  date: string;
  category: string;
  amount: number;
  description: string;
  notes?: string;
}

export default function IncomeForm({ onSubmit, onCancel, isSubmitting, initialData }: Props) {
  const [formData, setFormData] = useState<IncomeFormData>({
    date: initialData?.date?.split("T")[0] || new Date().toISOString().split("T")[0],
    category: initialData?.category || "",
    amount: initialData?.amount || 0,
    description: initialData?.description || "",
    notes: initialData?.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const categories = getIncomeCategoryOptions();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = "Date is required";
    if (new Date(formData.date) > new Date()) newErrors.date = "Date cannot be in future";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.amount || formData.amount <= 0) newErrors.amount = "Amount must be positive";
    if (!formData.description || formData.description.length < 5) {
      newErrors.description = "Description must be at least 5 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tanggal <span className="text-danger-600">*</span>
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        {errors.date && <p className="text-danger-600 text-xs mt-1">{errors.date}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kategori <span className="text-danger-600">*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Pilih Kategori</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-danger-600 text-xs mt-1">{errors.category}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Jumlah (Rp) <span className="text-danger-600">*</span>
        </label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          min="0"
          step="1000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        {errors.amount && <p className="text-danger-600 text-xs mt-1">{errors.amount}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Deskripsi <span className="text-danger-600">*</span>
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={200}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
        {errors.description && <p className="text-danger-600 text-xs mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Catatan (Opsional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : initialData ? "Perbarui Pemasukan" : "Tambah Pemasukan"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
      </div>
    </form>
  );
}
