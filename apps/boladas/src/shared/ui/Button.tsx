import { ButtonHTMLAttributes, forwardRef } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`provider-button ${className}`} // Keeping existing class for style compatibility
      {...props}
    />
  );
});
Button.displayName = "Button";
