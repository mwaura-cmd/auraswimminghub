"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { GalleryItem } from "@/lib/types";

interface GalleryLightboxProps {
  items: GalleryItem[];
  activeId: string | null;
  onChangeActiveId: (id: string) => void;
  onClose: () => void;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function GalleryLightbox({ items, activeId, onChangeActiveId, onClose }: GalleryLightboxProps) {
  const activeIndex = useMemo(() => {
    if (!activeId) {
      return -1;
    }
    return items.findIndex((item) => item.id === activeId);
  }, [activeId, items]);

  const item = activeIndex >= 0 ? items[activeIndex] : null;

  const goToPrevious = useCallback(() => {
    if (!item || items.length <= 1) {
      return;
    }

    const previousIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
    onChangeActiveId(items[previousIndex].id);
  }, [activeIndex, item, items, onChangeActiveId]);

  const goToNext = useCallback(() => {
    if (!item || items.length <= 1) {
      return;
    }

    const nextIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
    onChangeActiveId(items[nextIndex].id);
  }, [activeIndex, item, items, onChangeActiveId]);

  useEffect(() => {
    if (!item) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goToNext, goToPrevious, item, onClose]);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl border border-teal-500/30 bg-black/90 p-3 sm:p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
          <div>
            <p className="text-sm text-teal-50/90">{item.caption || "Aura Swimming gallery preview"}</p>
            <p className="mt-1 text-xs text-teal-200/75">Uploaded by {item.uploaderRole}{item.createdAt ? ` on ${formatCreatedAt(item.createdAt)}` : ""}</p>
          </div>
          <div className="inline-flex items-center gap-2">
            <a
              href={item.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-teal-500/45 bg-black/60 text-teal-100"
              aria-label="Open media in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-teal-500/45 bg-black/60 text-teal-100"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex max-h-[80vh] items-center justify-center overflow-hidden rounded-xl bg-black/70">
          {items.length > 1 && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-teal-500/45 bg-black/70 text-teal-100 sm:left-4"
              aria-label="Previous media"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {item.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.mediaUrl} alt={item.caption || "Gallery image"} className="max-h-[80vh] w-auto max-w-full object-contain" />
          ) : (
            <video src={item.mediaUrl} className="max-h-[80vh] w-auto max-w-full" controls autoPlay playsInline />
          )}

          {items.length > 1 && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-teal-500/45 bg-black/70 text-teal-100 sm:right-4"
              aria-label="Next media"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {items.length > 1 && (
          <p className="mt-3 text-center text-xs text-teal-200/70">
            {activeIndex + 1} of {items.length}
          </p>
        )}

        <div className="mt-1 text-center text-xs text-teal-200/60">Press Esc to close, and use left/right arrows to navigate.</div>
      </div>
    </div>
  );
}
