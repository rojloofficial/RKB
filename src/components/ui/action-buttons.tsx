import type { ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "edit" | "delete" | "default";
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
  const baseClasses = "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60";

  const variantClasses = {
    edit: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-300",
    delete: "bg-neutral-900 text-white hover:bg-neutral-800",
    default: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-300",
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
    <div className={`flex ${direction === "column" ? "flex-col" : "gap-2"}`}>
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
