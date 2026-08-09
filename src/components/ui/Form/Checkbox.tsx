import React from "react";
import { Check } from "lucide-react";
import "./form.css";

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  className = "",
}) => {
  return (
    <div
      className={`checkbox-field ${checked ? "checked" : ""} ${className}`}
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="checkbox-custom">
        {checked && <Check size={12} strokeWidth={3} />}
      </div>
      <span className="checkbox-label">{label}</span>
    </div>
  );
};

export default Checkbox;
