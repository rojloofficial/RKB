import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 shadow-2xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 hover:border-slate-400 sm:text-sm";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onlyNumbers?: boolean;
  onlyLetters?: boolean;
  error?: boolean | string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    { className, type, onlyNumbers, onlyLetters, error, onChange, onKeyDown, ...props },
    ref
  ) {
    const enforceNumbers = onlyNumbers || type === "number";

    return (
      <input
        ref={ref}
        type={enforceNumbers ? "text" : type}
        inputMode={enforceNumbers ? "numeric" : props.inputMode}
        className={cn(
          fieldBase,
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/20",
          className
        )}
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
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean | string }) {
  return (
    <textarea
      className={cn(
        fieldBase,
        "rounded-xl resize-y min-h-[100px]",
        error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/20",
        className
      )}
      {...props}
    />
  );
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; error?: boolean | string }
>(function Select({ className, children, error, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "cursor-pointer pr-10 bg-no-repeat bg-[right_1rem_center]",
        error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/20",
        className
      )}
      {...props}
    >
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
        "block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3 text-slate-800 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800 focus:border-amber-500 transition-colors cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
