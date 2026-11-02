export const PAYMENT_TERMS_VERSION = "2026-11-02";

export function CheckoutTerms({ accepted, onChange }: { accepted: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-start gap-3 text-sm leading-relaxed">
    <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={accepted} onChange={event => onChange(event.target.checked)} />
    <span>I have read and agree to the <a className="text-primary underline" href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a className="text-primary underline" href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>. I have reviewed the amount and currency shown before paying.</span>
  </label>;
}
