import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onlyNumbers?: boolean;
  onlyLetters?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    { className, type, onlyNumbers, onlyLetters, onChange, onKeyDown, ...props },
    ref
  ) {
    const enforceNumbers = onlyNumbers || type === "number";

    return (
      <input
        ref={ref}
        type={enforceNumbers ? "text" : type}
        inputMode={enforceNumbers ? "numeric" : props.inputMode}
        className={cn(fieldBase, className)}
        onKeyDown={(e) => {
          if (enforceNumbers) {
            if (
              e.ctrlKey ||
              e.metaKey ||
              [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ].includes(e.key)
            ) {
              onKeyDown?.(e);
              return;
            }
            if (!/^[0-9]$/.test(e.key)) {
              e.preventDefault();
              return;
            }
          } else if (onlyLetters) {
            if (
              e.ctrlKey ||
              e.metaKey ||
              [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ].includes(e.key)
            ) {
              onKeyDown?.(e);
              return;
            }
            if (!/^[a-zA-Z\s]$/.test(e.key)) {
              e.preventDefault();
              return;
            }
          }
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          if (enforceNumbers) {
            e.target.value = e.target.value.replace(/\D/g, "");
          } else if (onlyLetters) {
            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
          }
          onChange?.(e);
        }}
        {...props}
      />
    );
  }
);
TextInput.displayName = "TextInput";

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldBase, "rounded-xl", className)}
      {...props}
    />
  );
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, className)} {...props}>
      {children}
    </select>
  );
});
Select.displayName = "Select";

export function FileInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      className={cn(
        "block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-neutral-800 focus:border-neutral-900",
        className
      )}
      {...props}
    />
  );
}
