import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageHero } from "../components/ui.jsx";
import { safeUrl, thumbUrl } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

export function Lightbox({ photos, index, onClose, onMove }) {
  const photo = photos[index];
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const step = useCallback((delta) => onMove((index + delta + photos.length) % photos.length), [index, photos.length, onMove]);

  // Move focus into the dialog on open and give it back to the photo that opened it on close.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "Tab") {
        // Keep keyboard focus inside the dialog.
        const buttons = [...(dialogRef.current?.querySelectorAll("button") || [])];
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  // Rendered straight into <body> so it always covers the whole screen, above the header,
  // whatever animations or layers the page around it has.
  return createPortal(
    <div className="lightbox" ref={dialogRef} role="dialog" aria-modal="true" aria-label={photo.title || "Photo"} onClick={onClose}>
      <button type="button" className="lightbox__close" ref={closeRef} aria-label="Close" onClick={onClose}>
        <X size={26} />
      </button>
      <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>
        <ChevronLeft size={30} />
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={safeUrl(photo.image)} alt={photo.title || ""} />
        <figcaption>
          {photo.title} <span>{index + 1} / {photos.length}</span>
        </figcaption>
      </figure>
      <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>
        <ChevronRight size={30} />
      </button>
    </div>,
    document.body,
  );
}

export function PhotoGrid({ photos, limit }) {
  const [open, setOpen] = useState(null);
  const shown = (limit ? photos.slice(0, limit) : photos).filter((photo) => safeUrl(photo.image));
  return (
    <>
      <div className={`photo-grid${limit ? " photo-grid--preview" : ""}`}>
        {shown.map((photo, index) => (
          <button type="button" className="photo-grid__item" key={photo.id} onClick={() => setOpen(index)}>
            <img src={thumbUrl(photo.image)} alt={photo.title || ""} loading="lazy" decoding="async" />
            {photo.title && <span className="photo-grid__caption">{photo.title}</span>}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={shown} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </>
  );
}

export default function Gallery() {
  usePageTitle("Gallery");
  const { gallery } = useSite().site;
  return (
    <>
      <PageHero page="gallery" eyebrow="GALLERY · LIFE AT THE VINE" title="Moments of" accent="faith & family." image="/photos/church-family.jpg">
        Sundays, cell groups, prayer, children and celebrations — a glimpse of our church family.
      </PageHero>
      <section className="gallery section-pad">
        {gallery.length ? <PhotoGrid photos={gallery} /> : <p className="empty-state">Photos are coming soon.</p>}
      </section>
    </>
  );
}
