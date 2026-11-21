import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageHero } from "../components/ui.jsx";
import { useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

export function Lightbox({ photos, index, onClose, onMove }) {
  const photo = photos[index];
  const step = useCallback((delta) => onMove((index + delta + photos.length) % photos.length), [index, photos.length, onMove]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, step]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.title || "Photo"} onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label="Close" onClick={onClose}>
        <X size={26} />
      </button>
      <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>
        <ChevronLeft size={30} />
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.image} alt={photo.title || ""} />
        <figcaption>
          {photo.title} <span>{index + 1} / {photos.length}</span>
        </figcaption>
      </figure>
      <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>
        <ChevronRight size={30} />
      </button>
    </div>
  );
}

export function PhotoGrid({ photos, limit }) {
  const [open, setOpen] = useState(null);
  const shown = limit ? photos.slice(0, limit) : photos;
  return (
    <>
      <div className={`photo-grid${limit ? " photo-grid--preview" : ""}`}>
        {shown.map((photo, index) => (
          <button type="button" className="photo-grid__item" key={photo.id} onClick={() => setOpen(index)}>
            <img src={photo.image} alt={photo.title || ""} loading="lazy" />
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
      <PageHero eyebrow="GALLERY · LIFE AT THE VINE" title="Moments of" accent="faith & family." image="/photos/church-family.jpg">
        Sundays, cell groups, prayer, children and celebrations — a glimpse of our church family.
      </PageHero>
      <section className="gallery section-pad">
        {gallery.length ? <PhotoGrid photos={gallery} /> : <p className="empty-state">Photos are coming soon.</p>}
      </section>
    </>
  );
}
