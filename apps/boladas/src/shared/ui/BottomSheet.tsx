import { ReactNode } from "react";

export type BottomSheetProps = {
  open: boolean;
  title: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function BottomSheet({
  open,
  title,
  confirmLabel = "Concluir",
  onConfirm,
  onClose,
  children,
  className = "",
}: BottomSheetProps) {
  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 transition-all">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[450px] animate-in rounded-t-3xl bg-[var(--bg-app)] p-6 shadow-2xl slide-in-from-bottom duration-300 ${className}`}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-primary-600 px-6 py-2 font-bold text-white shadow-lg shadow-primary-600/20 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
