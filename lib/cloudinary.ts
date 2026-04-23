import { GalleryMediaType } from "@/lib/types";

interface CloudinaryUploadResult {
  mediaUrl: string;
  publicId: string;
  mediaType: GalleryMediaType;
}

interface CloudinaryUploadApiResponse {
  secure_url?: string;
  public_id?: string;
  resource_type?: string;
  error?: {
    message?: string;
  };
}

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const baseFolder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "gallery";

function mapResourceType(resourceType?: string): GalleryMediaType {
  if (resourceType === "video") {
    return "video";
  }
  return "image";
}

export async function uploadGalleryMedia(file: File, uploaderUid: string): Promise<CloudinaryUploadResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", `${baseFolder}/${uploaderUid}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as CloudinaryUploadApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Cloudinary upload failed.");
  }

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary response is missing file metadata.");
  }

  return {
    mediaUrl: payload.secure_url,
    publicId: payload.public_id,
    mediaType: mapResourceType(payload.resource_type),
  };
}
