import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, ShieldCheck } from "lucide-react";

export interface PaymentLineItem {
  label: string;
  value: string;
  highlight?: boolean;
}

interface PaymentConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  processing: boolean;
  title: string;
  description?: string;
  lineItems: PaymentLineItem[];
  totalLabel?: string;
  totalAmount: string;
  confirmText?: string;
  cancelText?: string;
}

export default function PaymentConfirmationModal({
  open,
  onClose,
  onConfirm,
  processing,
  title,
  description,
  lineItems,
  totalLabel = "Total",
  totalAmount,
  confirmText = "CONFIRM & PAY",
  cancelText = "CANCEL",
}: PaymentConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !processing && onClose()}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-md" data-testid="modal-payment-confirmation">
        <DialogHeader>
          <DialogTitle className="text-white uppercase text-lg tracking-[4px] text-center">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-white/50 text-center text-sm mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="border border-white/10 rounded p-4 mt-2 space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className={item.highlight ? "text-[#FF5A09]" : "text-white/60"}>{item.label}</span>
              <span className={item.highlight ? "text-[#FF5A09] font-semibold" : "text-white"}>{item.value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/20">
            <span className="text-white font-bold uppercase tracking-wider text-sm">{totalLabel}</span>
            <span className="text-[#FF5A09] font-bold text-xl">{totalAmount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/30 text-xs mt-1 justify-center">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Processed securely via Authorize.Net</span>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={onConfirm}
            disabled={processing}
            className="w-full bg-[#FF5A09] text-white font-bold text-sm uppercase px-6 leading-[48px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="button-confirm-payment"
          >
            <CreditCard className="h-4 w-4" />
            {processing ? "PROCESSING..." : confirmText}
          </button>
          <button
            onClick={onClose}
            disabled={processing}
            className="w-full text-white/50 text-sm uppercase tracking-wider hover:text-white transition-colors disabled:opacity-30"
            data-testid="button-cancel-payment"
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
