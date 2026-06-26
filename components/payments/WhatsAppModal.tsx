"use client";

import Modal from "@/components/ui/Modal";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  tab: "today" | "unpaid";
  onTabChange: (tab: "today" | "unpaid") => void;
  todayMsg: string;
  unpaidMsg: string;
  isCopiedToday: boolean;
  isCopiedUnpaid: boolean;
  onCopy: (msg: string, tab: "today" | "unpaid") => void;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  isLoading,
  tab,
  onTabChange,
  todayMsg,
  unpaidMsg,
  isCopiedToday,
  isCopiedUnpaid,
  onCopy,
}: WhatsAppModalProps) {
  const isCopied = tab === "today" ? isCopiedToday : isCopiedUnpaid;
  const currentMsg = tab === "today" ? todayMsg : unpaidMsg;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generator Pesan WhatsApp"
      size="lg"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
        {(["today", "unpaid"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "today" ? "Pembayaran Hari Ini" : "Belum Bayar Bulan Ini"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <textarea
            readOnly
            value={currentMsg}
            rows={12}
            className="w-full px-3 py-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none"
          />
          <button
            onClick={() => onCopy(currentMsg, tab)}
            className={`w-full mt-3 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isCopied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isCopied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Disalin!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Salin Pesan
              </>
            )}
          </button>
          <p className="text-xs text-slate-400 text-center mt-2">
            Tanda *bintang* akan tampil tebal di WhatsApp.
          </p>
        </>
      )}
    </Modal>
  );
}
