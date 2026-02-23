'use client';

import React, { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
}

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });

  const presets = [
    { label: '7 Hari', getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: '30 Hari', getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: '3 Bulan', getDates: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: '6 Bulan', getDates: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
    { label: '1 Tahun', getDates: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  ];

  const handlePresetClick = (preset: { label: string; getDates: () => DateRange }) => {
    const dates = preset.getDates();
    setRange(dates);
    onDateChange(startOfDay(dates.from!), endOfDay(dates.to!));
    setIsOpen(false);
  };

  const handleRangeSelect = (selectedRange: DateRange | undefined) => {
    setRange(selectedRange);
    if (selectedRange?.from && selectedRange?.to) {
      // Validate max range (2 years)
      const diffTime = Math.abs(selectedRange.to.getTime() - selectedRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 730) {
        toast.error(tCommon('date_range_max_2_years'));
        return;
      }

      onDateChange(startOfDay(selectedRange.from), endOfDay(selectedRange.to));
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setRange(undefined);
    onDateChange(undefined, undefined);
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Pilih rentang tanggal';
    return `${format(startDate, 'dd MMM yyyy', { locale: indonesianLocale })} - ${format(endDate, 'dd MMM yyyy', { locale: indonesianLocale })}`;
  };

  return (
    <div className="relative">
      {/* Trigger + Clear wrapper */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className={startDate && endDate ? 'text-slate-800 font-medium' : 'text-slate-400'}>
            {formatDateRange()}
          </span>
        </button>
        {startDate && endDate && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar Popover */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Quick Presets */}
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Pilih Cepat
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="p-4 date-range-picker-custom">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={handleRangeSelect}
                locale={indonesianLocale}
                disabled={{ after: new Date() }}
                numberOfMonths={1}
                classNames={{
                  root: 'rdp-custom',
                  months: 'flex flex-col',
                  month: 'space-y-4',
                  month_caption: 'flex justify-center items-center h-10',
                  caption_label: 'text-sm font-semibold text-slate-800',
                  nav: 'flex items-center gap-1',
                  button_previous: 'h-8 w-8 bg-transparent hover:bg-slate-100 rounded-lg transition-colors',
                  button_next: 'h-8 w-8 bg-transparent hover:bg-slate-100 rounded-lg transition-colors',
                  month_grid: 'w-full border-collapse',
                  weekdays: 'flex',
                  weekday: 'text-slate-400 font-medium text-xs w-10 h-10 flex items-center justify-center',
                  week: 'flex w-full',
                  day: 'relative w-10 h-10 text-center text-sm',
                  day_button: 'w-full h-full flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors',
                  selected: 'bg-blue-600 text-white hover:bg-blue-700',
                  range_start: 'bg-blue-600 text-white rounded-r-none',
                  range_end: 'bg-blue-600 text-white rounded-l-none',
                  range_middle: 'bg-blue-50 text-blue-600 rounded-none',
                  today: 'font-bold text-blue-600',
                  disabled: 'text-slate-300 hover:bg-transparent cursor-not-allowed',
                  outside: 'text-slate-300',
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs text-slate-400">
                {range?.from && range?.to
                  ? `${format(range.from, 'dd MMM', { locale: indonesianLocale })} - ${format(range.to, 'dd MMM yyyy', { locale: indonesianLocale })}`
                  : 'Pilih tanggal mulai dan akhir'}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}

      {/* Custom CSS for react-day-picker */}
      <style jsx global>{`
        .date-range-picker-custom .rdp-custom {
          --rdp-accent-color: #2563eb;
          --rdp-background-color: #eff6ff;
          margin: 0;
        }

        .date-range-picker-custom .rdp {
          margin: 0;
        }

        .date-range-picker-custom .rdp-day {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
