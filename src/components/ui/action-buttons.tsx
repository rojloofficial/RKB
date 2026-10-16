import type { ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "edit" | "delete" | "default" | "success";
  disabled?: boolean;
  className?: string;
};

export function ActionButton({
  children,
  type = "button",
  onClick,
  variant = "default",
  disabled = false,
  className = "",
}: ActionButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-2xs";

  const variantClasses = {
    edit: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 hover:border-slate-400",
    delete: "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300",
    default: "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 hover:border-slate-300",
    success: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

type EditDeleteButtonsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  direction?: "row" | "column";
};

export function EditDeleteButtons({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  editDisabled = false,
  deleteDisabled = false,
  direction = "row",
}: EditDeleteButtonsProps) {
  return (
    <div className={`flex items-center ${direction === "column" ? "flex-col gap-2" : "gap-2"}`}>
      {onEdit && (
        <ActionButton variant="edit" onClick={onEdit} disabled={editDisabled}>
          {editLabel}
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton variant="delete" onClick={onDelete} disabled={deleteDisabled}>
          {deleteLabel}
        </ActionButton>
      )}
    </div>
  );
}
