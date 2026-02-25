'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ResidenceInfoConfig {
  residenceName: string;
  residenceAddress: string;
}

export default function ResidenceInfoConfigForm() {
  const [config, setConfig] = useState<ResidenceInfoConfig>({
    residenceName: '',
    residenceAddress: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config/residence-info');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching residence info config:', error);
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config.residenceName.trim()) {
      toast.error('Nama perumahan tidak boleh kosong');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/system-config/residence-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Informasi perumahan berhasil disimpan');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menyimpan konfigurasi');
      }
    } catch (error) {
      console.error('Error saving residence info config:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama Perumahan
        </label>
        <Input
          type="text"
          value={config.residenceName}
          onChange={(e) => setConfig({ ...config, residenceName: e.target.value })}
          placeholder="Contoh: Perumahan Melati Indah"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alamat Perumahan <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <Input
          type="text"
          value={config.residenceAddress}
          onChange={(e) => setConfig({ ...config, residenceAddress: e.target.value })}
          placeholder="Contoh: Jl. Melati No. 1, Makassar"
        />
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">Preview di Profil User:</p>
        <div className="space-y-1 text-sm text-blue-800">
          <p><span className="font-medium">Perumahan:</span> {config.residenceName || '...'}</p>
          {config.residenceAddress && (
            <p><span className="font-medium">Alamat:</span> {config.residenceAddress}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </Button>
      </div>
    </form>
  );
}
