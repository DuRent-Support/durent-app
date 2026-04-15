"use client";

import { useState, type DragEvent, type RefObject } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ImageUploadItem = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type ImageUploadCardsProps<T extends ImageUploadItem = ImageUploadItem> = {
  label: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  images: T[];
  uploading: boolean;
  onFileChangeAction: (file: File) => void | Promise<void>;
  onPickImageAction: (index: number | null) => void;
  onRemoveImageAction: (index: number) => void;
  onUpdateOrderAction: (index: number, nextPosition: number) => void;
};

const MAX_UPLOAD_BYTES = 500 * 1024;
const WEBP_MIME = "image/webp";
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34];

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Tidak dapat membaca gambar"));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Konversi WebP gagal"));
          return;
        }
        resolve(blob);
      },
      WEBP_MIME,
      quality,
    );
  });

const convertToWebpUnderLimit = async (file: File) => {
  const image = await loadImage(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    throw new Error("Dimensi gambar tidak valid");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Canvas tidak tersedia");
  }

  let scale = 1;
  let bestBlob: Blob | null = null;

  for (let scaleAttempt = 0; scaleAttempt < 10; scaleAttempt += 1) {
    const targetWidth = Math.max(1, Math.floor(originalWidth * scale));
    const targetHeight = Math.max(1, Math.floor(originalHeight * scale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.webp`, {
          type: WEBP_MIME,
          lastModified: Date.now(),
        });
      }
    }

    if (targetWidth <= 320 || targetHeight <= 320) {
      break;
    }
    scale *= 0.85;
  }

  if (!bestBlob || bestBlob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran gambar masih di atas 500KB setelah dikompres");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([bestBlob], `${baseName}.webp`, {
    type: WEBP_MIME,
    lastModified: Date.now(),
  });
};

export default function ImageUploadCards<
  T extends ImageUploadItem = ImageUploadItem,
>({
  label,
  fileInputRef,
  images,
  uploading,
  onFileChangeAction,
  onPickImageAction,
  onRemoveImageAction,
  onUpdateOrderAction,
}: ImageUploadCardsProps<T>) {
  const [isDragActive, setIsDragActive] = useState(false);

  const processAndUploadFile = async (selectedFile: File) => {
    try {
      const webpFile = await convertToWebpUnderLimit(selectedFile);
      await onFileChangeAction(webpFile);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses gambar";
      toast.error(message);
    }
  };

  const handleLocalFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    await processAndUploadFile(selectedFile);
  };

  const handleDropZoneDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading) {
      setIsDragActive(true);
    }
  };

  const handleDropZoneDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDropZoneDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    if (uploading) {
      return;
    }

    const droppedFiles = event.dataTransfer?.files;
    const selectedFile = droppedFiles?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    await processAndUploadFile(selectedFile);
  };

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLocalFileChange}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={`${image.id ?? "new"}-${index}`}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onPickImageAction(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPickImageAction(index);
                }
              }}
              className="relative h-28 w-full cursor-pointer rounded-md border border-border bg-muted"
              style={
                image.preview_url || image.url
                  ? {
                      backgroundImage: `url(${image.preview_url || image.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {!image.url && (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Belum ada gambar
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemoveImageAction(index)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-destructive"
                aria-label="Hapus gambar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              <p className="truncate text-[11px] text-muted-foreground">
                {image.url || "Belum ada path gambar"}
              </p>
              <div className="grid gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Order
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(images.length, 1)}
                  value={image.position}
                  onChange={(event) =>
                    onUpdateOrderAction(index, Number(event.target.value) || 1)
                  }
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onPickImageAction(null)}
          disabled={uploading}
          onDragOver={handleDropZoneDragOver}
          onDragEnter={handleDropZoneDragOver}
          onDragLeave={handleDropZoneDragLeave}
          onDrop={handleDropZoneDrop}
          className={`rounded-lg border border-dashed p-3 transition-colors disabled:opacity-60 ${
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/30 hover:bg-muted/50"
          }`}
        >
          <div className="flex h-full min-h-[180px] items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
              <span className="text-xs font-medium">
                {uploading
                  ? "Uploading..."
                  : isDragActive
                    ? "Lepas foto untuk upload"
                    : "Tambah gambar / Drag & drop foto"}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
