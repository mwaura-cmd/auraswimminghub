"use client";

import Link from "next/link";
import { ImagePlus, Pin, PlayCircle, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { subscribeGalleryItems } from "@/lib/realtimedb";
import { GalleryItem } from "@/lib/types";

const PREVIEW_LIMIT = 8;

export function HomeGalleryPreview() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGalleryItems(
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
      },
      (loadError) => {
        setError(loadError.message);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const previewItems = useMemo(() => items.slice(0, PREVIEW_LIMIT), [items]);

  useEffect(() => {
    if (!previewId) {
      return;
    }

    const isStillVisible = previewItems.some((item) => item.id === previewId);
    if (!isStillVisible) {
      setPreviewId(null);
    }
  }, [previewId, previewItems]);

  return (
    <section className="section-shell mt-20">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl">Gallery</h2>
        <Link href="/gallery" className="btn-secondary text-sm">
          View Full Gallery
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">Failed to load gallery preview.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading &&
          Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (
            <div
              key={index}
              className="glass-card h-40 rounded-xl bg-[linear-gradient(140deg,rgba(20,184,166,0.2),rgba(19,78,74,0.2),rgba(3,7,18,0.8))]"
            />
          ))}

        {!loading && previewItems.length === 0 && (
          <div className="glass-card col-span-full rounded-xl p-5 text-sm text-teal-100/70">No gallery media uploaded yet.</div>
        )}

        {!loading &&
          previewItems.map((item) => (
            <article key={item.id} className="glass-card overflow-hidden rounded-xl">
              <div className="relative">
                <button type="button" className="group block w-full" onClick={() => setPreviewId(item.id)} aria-label="Preview gallery media">
                  {item.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.mediaUrl} alt={item.caption || "Gallery image"} className="h-40 w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={item.mediaUrl} className="h-40 w-full object-cover" preload="metadata" muted playsInline />
                  )}

                  {item.mediaType === "video" && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
                      <PlayCircle className="h-10 w-10 text-white/90" />
                    </span>
                  )}
                </button>

                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[11px] text-teal-100">
                  {item.mediaType === "image" ? <ImagePlus className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  <span>{item.mediaType}</span>
                </div>

                {item.pinned && (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-teal-500/80 px-2 py-1 text-[11px] font-semibold text-black">
                    <Pin className="h-3.5 w-3.5" />
                    <span>Pinned</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm text-teal-50/90">{item.caption || "Aura Swimming session highlight"}</p>
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full text-xs"
                  onClick={() => setPreviewId(item.id)}
                >
                  Preview
                </button>
              </div>
            </article>
          ))}
      </div>

      <GalleryLightbox
        items={previewItems}
        activeId={previewId}
        onChangeActiveId={setPreviewId}
        onClose={() => setPreviewId(null)}
      />
    </section>
  );
}
