import React, { useMemo } from "react";
import { WheelPicker } from "./WheelPicker";

interface WheelTimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
}

export function WheelTimePicker({ value, onChange }: WheelTimePickerProps) {
  const [h, m] = useMemo(() => {
    if (!value) return [19, 0];
    const parts = value.split(":");
    return [parseInt(parts[0]), parseInt(parts[1])];
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i * 5),
    [],
  ); // 5-min intervals

  const updateTime = (hour: number, minute: number) => {
    const hStr = hour.toString().padStart(2, "0");
    const mStr = minute.toString().padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
  };

  return (
    <div className="flex gap-1 bg-[var(--bg-app)] rounded-2xl p-2 items-center">
      <div className="flex-1">
        <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
          Hora
        </div>
        <WheelPicker
          options={hours}
          value={h}
          onChange={(v) => updateTime(v as number, m)}
        />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
          Minuto
        </div>
        <WheelPicker
          options={minutes}
          value={m}
          onChange={(v) => updateTime(h, v as number)}
        />
      </div>
    </div>
  );
}
