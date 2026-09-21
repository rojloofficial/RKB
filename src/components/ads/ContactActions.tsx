import Button from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ContactActionsProps = {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  className?: string;
};

export default function ContactActions({
  phone,
  whatsapp,
  telegram,
  className,
}: ContactActionsProps) {
  if (!phone && !whatsapp && !telegram) return null;

  return (
    <div className={cn("flex flex-wrap", className ?? "gap-2")}>
      {phone && (
        <Button
          href={`tel:${phone.replace(/\s/g, "")}`}
          variant="solid"
          size="sm"
          className="!text-white"
        >
          Call
        </Button>
      )}
      {whatsapp && (
        <Button
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          variant="solid"
          size="sm"
          className="!bg-green-600 !text-white hover:!bg-green-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </Button>
      )}
      {telegram && (
        <Button
          href={`https://t.me/${telegram.replace(/^@/, "")}`}
          variant="solid"
          size="sm"
          className="!bg-sky-500 !text-white hover:!bg-sky-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </Button>
      )}
    </div>
  );
}
