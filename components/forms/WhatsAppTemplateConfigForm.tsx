"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

interface WhatsAppTemplateConfig {
  template: string;
}

interface Props {
  initialConfig: WhatsAppTemplateConfig;
  onSaveSuccess: (config: WhatsAppTemplateConfig) => void;
  onSaveError: (message: string) => void;
}

export default function WhatsAppTemplateConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: Props) {
  const [template, setTemplate] = useState(initialConfig.template);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = template.trim();
    if (trimmed.length < 10) {
      onSaveError("Template harus minimal 10 karakter");
      return;
    }
    if (trimmed.length > 500) {
      onSaveError("Template tidak boleh lebih dari 500 karakter");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/system-config/whatsapp-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        onSaveError(err.error || "Gagal menyimpan konfigurasi");
        return;
      }

      onSaveSuccess({ template: trimmed });
    } catch {
      onSaveError("Terjadi kesalahan jaringan");
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview: replace placeholders with example values
  const preview = template
    .replace(/\{block\}/g, "A")
    .replace(/\{number\}/g, "12");

  const charCount = template.length;
  const isOverLimit = charCount > 500;
  const isUnderMin = template.trim().length < 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Template input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Pesan
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
            isOverLimit ? "border-red-400 focus:ring-red-400" : "border-gray-300"
          }`}
          placeholder="Contoh: Halo, saya warga blok {block} no {number}, saya ingin minta bantuan"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            Placeholder yang tersedia:{" "}
            <code className="bg-gray-100 px-1 rounded font-mono">{"{block}"}</code>{" "}
            dan{" "}
            <code className="bg-gray-100 px-1 rounded font-mono">{"{number}"}</code>
          </p>
          <span
            className={`text-xs font-medium ${
              isOverLimit ? "text-red-500" : "text-gray-400"
            }`}
          >
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
          <p className="text-xs font-medium text-green-700">
            Preview pesan (Blok A, No. 12):
          </p>
        </div>
        <p className="text-sm text-green-900 italic">{preview || "—"}</p>
      </div>

      <button
        type="submit"
        disabled={isSaving || isOverLimit || isUnderMin}
        className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? "Menyimpan..." : "Simpan Template"}
      </button>
    </form>
  );
}
