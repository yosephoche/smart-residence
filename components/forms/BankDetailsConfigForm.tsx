'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface BankDetailsConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function BankDetailsConfigForm() {
  const [config, setConfig] = useState<BankDetailsConfig>({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config/bank-details');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching bank details config:', error);
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!config.bankName.trim()) {
      toast.error('Nama bank tidak boleh kosong');
      return;
    }

    if (!config.accountNumber.trim()) {
      toast.error('Nomor rekening tidak boleh kosong');
      return;
    }

    if (!/^\d+$/.test(config.accountNumber)) {
      toast.error('Nomor rekening harus berupa angka');
      return;
    }

    if (!config.accountName.trim()) {
      toast.error('Nama pemegang rekening tidak boleh kosong');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/system-config/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Konfigurasi rekening bank berhasil disimpan');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menyimpan konfigurasi');
      }
    } catch (error) {
      console.error('Error saving bank details config:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4" />
        <div className="h-10 bg-gray-200 rounded mb-4" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama Bank
        </label>
        <Input
          type="text"
          value={config.bankName}
          onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
          placeholder="Contoh: BCA, Mandiri, BNI"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nomor Rekening
        </label>
        <Input
          type="text"
          value={config.accountNumber}
          onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
          placeholder="Contoh: 1234567890"
          required
          pattern="\d+"
        />
        <p className="text-xs text-gray-500 mt-1">Hanya angka yang diizinkan</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nama Pemegang Rekening
        </label>
        <Input
          type="text"
          value={config.accountName}
          onChange={(e) => setConfig({ ...config, accountName: e.target.value })}
          placeholder="Contoh: PT Perumahan Melati"
          required
        />
      </div>

      {/* Preview Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">Preview di Upload Screen:</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Rekening Tujuan:</span>
            <span className="font-medium text-blue-900">
              {config.bankName || '...'} {config.accountNumber || '...'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Atas Nama:</span>
            <span className="font-medium text-blue-900">{config.accountName || '...'}</span>
          </div>
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
