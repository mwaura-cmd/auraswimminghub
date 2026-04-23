"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Pin, PinOff, PlayCircle, Trash2, Upload, Video } from "lucide-react";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { useAuth } from "@/components/providers/auth-provider";
import { uploadGalleryMedia } from "@/lib/cloudinary";
import {
  createGalleryItem,
  deleteGalleryItem,
  subscribeGalleryItems,
  updateGalleryCaption,
  updateGalleryPinned,
} from "@/lib/realtimedb";
import { GalleryItem } from "@/lib/types";

function getFileKind(file: File) {
  if (file.type.startsWith("image/")) {
    return "image" as const;
  }

  if (file.type.startsWith("video/")) {
    return "video" as const;
  }

  return null;
}

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const BASE_PAGE_SIZE = 8;

type GalleryFilter = "all" | "pinned" | "image" | "video";

const FILTER_OPTIONS: Array<{ value: GalleryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

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

export default function GalleryPage() {
  const { firebaseUser, role, isDemoMode } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(BASE_PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPinned, setUploadPinned] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const canUpload = useMemo(() => role === "admin" || role === "instructor", [role]);

  useEffect(() => {
    const unsubscribe = subscribeGalleryItems(
      (nextItems) => {
        setItems(nextItems);
        setLoadingGallery(false);
      },
      (e) => {
        setError(e.message);
        setLoadingGallery(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const onSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!getFileKind(file)) {
      setError("Only image and video files are supported.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Files must be 30MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const onUpload = async () => {
    if (!canUpload) {
      setError("Only admin or instructor can upload gallery media.");
      return;
    }

    if (isDemoMode) {
      setError("Uploads are disabled in demo mode.");
      return;
    }

    if (!firebaseUser) {
      setError("Sign in to upload media.");
      return;
    }

    if (!selectedFile) {
      setError("Select an image or video first.");
      return;
    }

    if (!getFileKind(selectedFile)) {
      setError("Unsupported file type.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const uploadResult = await uploadGalleryMedia(selectedFile, firebaseUser.uid);

      await createGalleryItem({
        caption: caption.trim(),
        mediaUrl: uploadResult.mediaUrl,
        mediaPath: uploadResult.publicId,
        mediaType: uploadResult.mediaType,
        uploaderUid: firebaseUser.uid,
        uploaderRole: role!,
        pinned: uploadPinned,
      });

      setCaption("");
      setSelectedFile(null);
      setUploadPinned(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const onTogglePinned = async (item: GalleryItem) => {
    if (!canUpload) {
      setError("Only admin or instructor can pin items.");
      return;
    }

    try {
      await updateGalleryPinned(item.id, !item.pinned);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update pin";
      setError(message);
    }
  };

  const startEditing = (item: GalleryItem) => {
    setEditingId(item.id);
    setEditingCaption(item.caption);
  };

  const onSaveCaption = async () => {
    if (!editingId) {
      return;
    }

    try {
      await updateGalleryCaption(editingId, editingCaption);
      setEditingId(null);
      setEditingCaption("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update caption";
      setError(message);
    }
  };

  const onDeleteItem = async (item: GalleryItem) => {
    if (!canUpload) {
      setError("Only admin or instructor can delete items.");
      return;
    }

    const confirmed = window.confirm("Delete this gallery item from the gallery feed? The original Cloudinary file will remain.");
    if (!confirmed) {
      return;
    }

    try {
      await deleteGalleryItem(item.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete item";
      setError(message);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeFilter === "pinned") {
      return items.filter((item) => item.pinned);
    }

    if (activeFilter === "image") {
      return items.filter((item) => item.mediaType === "image");
    }

    if (activeFilter === "video") {
      return items.filter((item) => item.mediaType === "video");
    }

    return items;
  }, [activeFilter, items]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  useEffect(() => {
    setVisibleCount(BASE_PAGE_SIZE);
  }, [activeFilter]);

  useEffect(() => {
    if (filteredItems.length < visibleCount && filteredItems.length !== 0) {
      setVisibleCount(filteredItems.length);
    }
  }, [filteredItems.length, visibleCount]);

  useEffect(() => {
    if (!previewId) {
      return;
    }

    const existsInVisibleItems = visibleItems.some((item) => item.id === previewId);
    if (!existsInVisibleItems) {
      setPreviewId(null);
    }
  }, [previewId, visibleItems]);

  return (
    <div className="section-shell pb-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">Gallery</h1>
          <p className="mt-3 max-w-2xl text-teal-50/70">
            Moments from classes, drills, technique sessions, and achievements.
          </p>
        </div>

        {canUpload && (
          <div className="glass-card w-full max-w-xl rounded-2xl p-4 sm:p-5">
            <p className="text-sm font-semibold tracking-[0.08em] text-teal-200">Upload Media</p>
            <div className="mt-3 grid gap-3">
              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Caption (optional)"
                maxLength={240}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3 text-sm"
              />

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-black/40 px-3 py-2 text-sm text-teal-100">
                <Upload className="h-4 w-4" />
                <span>{selectedFile ? selectedFile.name : "Choose image or video"}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={onSelectFile} />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-teal-100">
                <input
                  type="checkbox"
                  checked={uploadPinned}
                  onChange={(event) => setUploadPinned(event.target.checked)}
                  className="h-4 w-4 accent-teal-500"
                />
                Pin this item after upload
              </label>

              <button type="button" className="btn-primary w-full" onClick={onUpload} disabled={busy}>
                {busy ? "Uploading..." : "Upload to Gallery"}
              </button>
            </div>
          </div>
        )}
      </div>

      {!canUpload && (
        <p className="mt-6 text-sm text-teal-100/75">Only instructors and admins can upload or pin gallery items.</p>
      )}

      {error && <p className="mt-5 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "border-teal-300 bg-teal-400/20 text-teal-100"
                  : "border-teal-700/50 bg-black/50 text-teal-200/80 hover:border-teal-400/70"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loadingGallery && (
          <>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="glass-card h-56 animate-pulse rounded-xl bg-gradient-to-br from-teal-600/30 via-teal-900/30 to-black/70" />
            ))}
          </>
        )}

        {!loadingGallery && filteredItems.length === 0 && (
          <div className="glass-card col-span-full rounded-xl p-5 text-sm text-teal-100/70">
            {activeFilter === "all" ? "No media uploaded yet." : "No media matches this filter yet."}
          </div>
        )}

        {!loadingGallery &&
          visibleItems.map((item) => (
            <article key={item.id} className="glass-card overflow-hidden rounded-xl">
              <div className="relative">
                <button type="button" className="group block w-full" onClick={() => setPreviewId(item.id)} aria-label="Preview gallery media">
                  {item.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.mediaUrl} alt={item.caption || "Gallery image"} className="h-56 w-full cursor-zoom-in object-cover" loading="lazy" />
                  ) : (
                    <video src={item.mediaUrl} className="h-56 w-full object-cover" preload="metadata" muted playsInline />
                  )}

                  {item.mediaType === "video" && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
                      <PlayCircle className="h-12 w-12 text-white/90" />
                    </span>
                  )}
                </button>

                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-teal-100">
                  {item.mediaType === "image" ? <ImagePlus className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  <span>{item.mediaType}</span>
                </div>

                {item.pinned && (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-teal-500/80 px-2 py-1 text-xs font-semibold text-black">
                    <Pin className="h-3.5 w-3.5" />
                    <span>Pinned</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingCaption}
                      onChange={(event) => setEditingCaption(event.target.value)}
                      className="w-full rounded-lg border border-teal-500/35 bg-black/60 px-2 py-1.5 text-sm"
                      maxLength={240}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary w-full text-xs" onClick={onSaveCaption}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary w-full text-xs"
                        onClick={() => {
                          setEditingId(null);
                          setEditingCaption("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-teal-50/90">{item.caption || "No caption"}</p>
                )}
                <p className="mt-1 text-xs text-teal-200/75">Uploaded by {item.uploaderRole}</p>
                <p className="mt-1 text-xs text-teal-200/55">{formatCreatedAt(item.createdAt)}</p>

                <button type="button" className="btn-secondary mt-3 w-full text-xs" onClick={() => setPreviewId(item.id)}>
                  Preview
                </button>

                {canUpload && (
                  <div className="mt-3 grid gap-2">
                    <button type="button" className="btn-secondary w-full text-xs" onClick={() => onTogglePinned(item)}>
                      {item.pinned ? (
                        <span className="inline-flex items-center gap-2">
                          <PinOff className="h-4 w-4" /> Unpin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Pin className="h-4 w-4" /> Pin
                        </span>
                      )}
                    </button>

                    {editingId !== item.id && firebaseUser?.uid === item.uploaderUid && (
                      <button type="button" className="btn-secondary w-full text-xs" onClick={() => startEditing(item)}>
                        <span className="inline-flex items-center gap-2">
                          <Pencil className="h-4 w-4" /> Edit Caption
                        </span>
                      </button>
                    )}

                    {firebaseUser?.uid === item.uploaderUid && (
                      <button type="button" className="btn-secondary w-full text-xs text-rose-300" onClick={() => onDeleteItem(item)}>
                        <span className="inline-flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> Delete
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
      </div>

      {!loadingGallery && visibleCount < filteredItems.length && (
        <div className="mt-6 flex justify-center">
          <button type="button" className="btn-secondary" onClick={() => setVisibleCount((count) => count + BASE_PAGE_SIZE)}>
            Load More
          </button>
        </div>
      )}

      <GalleryLightbox
        items={visibleItems}
        activeId={previewId}
        onChangeActiveId={setPreviewId}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
}
