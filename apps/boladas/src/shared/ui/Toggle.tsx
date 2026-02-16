interface ToggleProps {
  label: string;
  subLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: string;
}

export function Toggle({
  label,
  subLabel,
  checked,
  onChange,
  icon,
}: ToggleProps) {
  return (
    <div
      className="flex items-center justify-between py-2 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-app)] text-xl border border-[var(--border-color)] group-hover:bg-[var(--border-color)] transition-colors">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors">
            {label}
          </p>
          {subLabel && (
            <p className="text-xs text-[var(--text-secondary)]">{subLabel}</p>
          )}
        </div>
      </div>

      <div
        className={`relative h-6 w-11 rounded-full p-1 transition-colors duration-200 ease-in-out ${
          checked ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <div
          className={`h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
