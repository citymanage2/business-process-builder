import * as React from "react";
import PhoneInputComponent from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder, disabled, className }, ref) => {
    const handleChange = (val: any) => {
      onChange?.(val);
    };

    return (
      <div className={cn("relative", className)}>
        <PhoneInputComponent
          international
          defaultCountry="RU"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          inputComponent={Input}
          className="phone-input-wrapper"
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
