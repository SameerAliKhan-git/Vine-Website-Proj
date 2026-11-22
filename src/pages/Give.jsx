import { useState } from "react";
import { Building2, Check, Copy, HeartHandshake, Smartphone } from "lucide-react";
import { PageHero } from "../components/ui.jsx";
import { safeUrl } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

function CopyValue({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="copy-row">
      <span className="copy-row__label">{label}</span>
      <span className="copy-row__value">{value}</span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function Give() {
  usePageTitle("Give");
  const { settings } = useSite().site;
  const hasUpi = settings.upiId || safeUrl(settings.upiQrImage);
  const hasBank = settings.bankAccountNumber;
  const upiLink = settings.upiId
    ? `upi://pay?${new URLSearchParams({ pa: settings.upiId, pn: settings.bankAccountName || settings.name, cu: "INR" })}`
    : "";

  return (
    <>
      <PageHero page="give" image="/gallery/vine-02.webp" eyebrow="GIVING · GENEROSITY THAT GROWS" title="Love grows when we" accent="give.">
        {settings.givingIntro}
      </PageHero>
      <section className="give section-pad">
        {!hasUpi && !hasBank && (
          <div className="give-card give-card--empty">
            <HeartHandshake size={30} strokeWidth={1.3} aria-hidden="true" />
            <h2>Giving details coming soon</h2>
            <p>A secure way to give will be available here shortly. Thank you for your generosity.</p>
          </div>
        )}
        {hasUpi && (
          <div className="give-card">
            <span className="give-card__icon">
              <Smartphone size={22} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2>Give with UPI</h2>
            <p>Scan with Google Pay, PhonePe, Paytm or any UPI app.</p>
            {safeUrl(settings.upiQrImage) && (
              <img className="give-card__qr" src={safeUrl(settings.upiQrImage)} alt="UPI QR code for giving" />
            )}
            <CopyValue label="UPI ID" value={settings.upiId} />
            {upiLink && (
              <a className="button give-card__mobile" href={upiLink}>
                Open UPI app
              </a>
            )}
          </div>
        )}
        {hasBank && (
          <div className="give-card">
            <span className="give-card__icon">
              <Building2 size={22} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2>Bank transfer</h2>
            <p>Give via NEFT, RTGS or IMPS to our church account.</p>
            <CopyValue label="Account name" value={settings.bankAccountName} />
            <CopyValue label="Account no." value={settings.bankAccountNumber} />
            <CopyValue label="IFSC" value={settings.bankIfsc} />
            <CopyValue label="Bank" value={settings.bankName} />
            <CopyValue label="Branch" value={settings.bankBranch} />
          </div>
        )}
        {(hasUpi || hasBank) && settings.bankAccountName && (
          <p className="give-note">
            Before you pay, please check that the name shown in your UPI or banking app is{" "}
            <strong>{settings.bankAccountName}</strong>. We will never ask you to give to a personal account by phone or
            WhatsApp.
          </p>
        )}
      </section>
    </>
  );
}
