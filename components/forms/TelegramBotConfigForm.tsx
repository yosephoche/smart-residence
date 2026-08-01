'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Link2, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface TelegramBotConfig {
  enabled: boolean;
  groupChatId: string;
  notifyOnUpload: boolean;
}

export default function TelegramBotConfigForm() {
  const [config, setConfig] = useState<TelegramBotConfig>({
    enabled: false,
    groupChatId: '',
    notifyOnUpload: true,
  });
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const [configRes, linkRes] = await Promise.all([
        fetch('/api/system-config/telegram-bot'),
        fetch('/api/telegram/link-code'),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig({
          enabled: data.enabled,
          groupChatId: data.groupChatId,
          notifyOnUpload: data.notifyOnUpload,
        });
        setTokenConfigured(Boolean(data.tokenConfigured));
      }

      if (linkRes.ok) {
        const data = await linkRes.json();
        setLinked(Boolean(data.linked));
      }
    } catch (error) {
      console.error('Error fetching telegram bot config:', error);
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (config.enabled && !config.groupChatId.trim()) {
      toast.error('Chat ID grup wajib diisi saat notifikasi diaktifkan');
      return;
    }

    if (config.groupChatId && !/^-?\d+$/.test(config.groupChatId.trim())) {
      toast.error('Chat ID harus berupa angka (grup biasanya diawali tanda minus)');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/system-config/telegram-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...config, groupChatId: config.groupChatId.trim() }),
      });

      if (response.ok) {
        toast.success('Konfigurasi bot Telegram berhasil disimpan');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menyimpan konfigurasi');
      }
    } catch (error) {
      console.error('Error saving telegram bot config:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/telegram/link-code', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setLinkCode(data.code);
        toast.success('Kode dibuat. Berlaku 10 menit.');
      } else {
        toast.error(data.error || 'Gagal membuat kode');
      }
    } catch (error) {
      console.error('Error generating link code:', error);
      toast.error('Terjadi kesalahan saat membuat kode');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        toast.success('Pesan tes terkirim ke grup');
      } else {
        toast.error(data.error || 'Gagal mengirim pesan tes');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Terjadi kesalahan saat mengirim pesan tes');
    } finally {
      setIsTesting(false);
    }
  };

  const copyCode = async () => {
    if (!linkCode) return;
    await navigator.clipboard.writeText(`/link ${linkCode}`);
    toast.success('Perintah disalin');
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
      {!tokenConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">TELEGRAM_BOT_TOKEN belum diatur.</span>{' '}
            Tambahkan token dari @BotFather ke environment variable server, lalu deploy ulang.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Aktifkan Notifikasi Telegram
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Kirim notifikasi ke grup admin saat warga mengunggah bukti pembayaran.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
              config.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Chat ID Grup Admin
        </label>
        <Input
          type="text"
          value={config.groupChatId}
          onChange={(e) => setConfig({ ...config, groupChatId: e.target.value })}
          placeholder="Contoh: -1001234567890"
        />
        <p className="text-xs text-slate-500 mt-1">
          Tambahkan bot ke grup, jadikan admin grup, lalu kirim <code>/chatid</code> di grup
          tersebut untuk mendapatkan nilainya.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Notifikasi Saat Upload
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Matikan jika hanya ingin memakai perintah <code>/pending</code> secara manual.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.notifyOnUpload}
          onClick={() => setConfig({ ...config, notifyOnUpload: !config.notifyOnUpload })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            config.notifyOnUpload ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
              config.notifyOnUpload ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Account linking */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-700" />
          <p className="text-sm font-medium text-blue-900">Hubungkan Akun Telegram Anda</p>
        </div>
        <p className="text-sm text-blue-800">
          {linked
            ? 'Akun Telegram Anda sudah terhubung. Buat kode baru jika ingin berpindah akun.'
            : 'Akun Anda belum terhubung, sehingga tombol Setujui/Tolak di bot akan ditolak.'}
        </p>

        {linkCode && (
          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
            <code className="text-sm font-semibold text-blue-900 flex-1">/link {linkCode}</code>
            <button
              type="button"
              onClick={copyCode}
              className="text-blue-700 hover:text-blue-900"
              aria-label="Salin perintah"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleGenerateCode} disabled={isGenerating}>
            {isGenerating ? 'Membuat...' : 'Buat Kode'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting}>
            <Send className="w-4 h-4 mr-1.5" />
            {isTesting ? 'Mengirim...' : 'Kirim Tes'}
          </Button>
        </div>
        {linkCode && (
          <p className="text-xs text-blue-700">
            Kirim perintah di atas sebagai chat pribadi ke bot. Kode berlaku 10 menit dan hanya
            bisa dipakai sekali.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </Button>
      </div>
    </form>
  );
}
