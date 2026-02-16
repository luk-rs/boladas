import React, { useMemo } from "react";
import { WheelPicker } from "./WheelPicker";

interface WheelDayOfWeekPickerProps {
  value: number; // 0-6
  onChange: (value: number) => void;
}

export function WheelDayOfWeekPicker({
  value,
  onChange,
}: WheelDayOfWeekPickerProps) {
  const days = [
    { label: "Domingo", value: 0 },
    { label: "Segunda", value: 1 },
    { label: "Terça", value: 2 },
    { label: "Quarta", value: 3 },
    { label: "Quinta", value: 4 },
    { label: "Sexta", value: 5 },
    { label: "Sábado", value: 6 },
  ];

  const options = days.map((d) => d.label);
  const currentValue = days.find((d) => d.value === value)?.label || "Segunda";

  return (
    <div className="bg-[var(--bg-app)] rounded-2xl p-2 items-center min-w-[140px]">
      <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
        Dia da Semana
      </div>
      <WheelPicker
        options={options}
        value={currentValue}
        onChange={(v) => {
          const day = days.find((d) => d.label === v);
          if (day) onChange(day.value);
        }}
      />
    </div>
  );
}
