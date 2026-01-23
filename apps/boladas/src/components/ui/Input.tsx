import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className={`input-group ${className}`}>
        {label && <label htmlFor={id}>{label}</label>}
        <input ref={ref} id={id} className="input" {...props} />
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";
