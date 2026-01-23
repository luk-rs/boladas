import React, { useMemo } from "react";
import { WheelPicker } from "./WheelPicker";

interface WheelDatePickerProps {
  value: string; // ISO date YYYY-MM-DD
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  showYear?: boolean;
}

export function WheelDatePicker({
  value,
  onChange,
  minYear = 2020,
  maxYear = 2035,
  showYear = true,
}: WheelDatePickerProps) {
  const date = useMemo(() => {
    const d = value ? new Date(value) : new Date();
    // Verify if date is valid
    if (isNaN(d.getTime())) return new Date();
    return d;
  }, [value]);

  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // 1-12
  const currentDay = date.getDate();

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear],
  );
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const months = useMemo(() => monthNames, []);
  const daysInMonth = useMemo(() => {
    const days = new Date(currentYear, currentMonth, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [currentYear, currentMonth]);

  const updateDate = (y: number, m: number, d: number) => {
    const yearStr = y.toString();
    const monthStr = m.toString().padStart(2, "0");
    const dayStr = d.toString().padStart(2, "0");
    onChange(`${yearStr}-${monthStr}-${dayStr}`);
  };

  return (
    <div className="flex gap-1 bg-[var(--bg-app)] rounded-2xl p-2 items-center">
      <div className="flex-1">
        <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
          Dia
        </div>
        <WheelPicker
          options={daysInMonth}
          value={currentDay}
          onChange={(v) => updateDate(currentYear, currentMonth, v as number)}
        />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
          Mês
        </div>
        <WheelPicker
          options={months}
          value={monthNames[currentMonth - 1]}
          onChange={(v) =>
            updateDate(
              currentYear,
              monthNames.indexOf(v as string) + 1,
              currentDay,
            )
          }
        />
      </div>
      {showYear && (
        <div className="flex-1">
          <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
            Ano
          </div>
          <WheelPicker
            options={years}
            value={currentYear}
            onChange={(v) => updateDate(v as number, currentMonth, currentDay)}
          />
        </div>
      )}
    </div>
  );
}
