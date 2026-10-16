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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {phone && (
        <Button
          href={`tel:${phone.replace(/\s/g, "")}`}
          variant="solid"
          size="sm"
          className="!bg-slate-900 !text-white hover:!bg-slate-800 shadow-xs"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>Call</span>
        </Button>
      )}
      {whatsapp && (
        <Button
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          variant="solid"
          size="sm"
          className="!bg-[#25D366] !text-white hover:!bg-[#1ea952] shadow-xs !border-transparent"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.582 1.961.948 3.018.948h.001c3.18 0 5.767-2.586 5.768-5.766.001-3.181-2.586-5.767-5.768-5.767zm7.55 12.067c-1.397 1.398-3.256 2.167-5.234 2.167-1.077 0-2.128-.277-3.064-.805l-4.57 1.199 1.22-4.455c-.583-.984-.891-2.109-.89-3.262.002-3.559 2.898-6.455 6.458-6.455 1.725.001 3.346.673 4.566 1.894 1.221 1.221 1.894 2.843 1.894 4.568-.002 1.979-.78 3.799-2.174 5.149z" />
          </svg>
          <span>WhatsApp</span>
        </Button>
      )}
      {telegram && (
        <Button
          href={`https://t.me/${telegram.replace(/^@/, "")}`}
          variant="solid"
          size="sm"
          className="!bg-[#229ED9] !text-white hover:!bg-[#1d87ba] shadow-xs !border-transparent"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.666 8.354l-1.92 9.052c-.144.636-.52.792-1.054.492l-2.934-2.163-1.416 1.364c-.156.156-.288.288-.588.288l.21-2.988 5.436-4.914c.24-.216-.048-.336-.372-.12l-6.72 4.23-2.904-.906c-.63-.198-.642-.63.132-.936l11.352-4.38c.528-.192.984.12.876.882z" />
          </svg>
          <span>Telegram</span>
        </Button>
      )}
    </div>
  );
}
