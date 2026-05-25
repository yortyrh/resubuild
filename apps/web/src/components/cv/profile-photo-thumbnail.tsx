'use client';

import { Camera, ImageOff, Pencil, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProfilePhotoThumbnailProps {
  src: string | undefined;
  isOwnedMedia: boolean;
  onUpload: () => void;
  onEditCrop?: () => void;
  onDelete: () => void;
}

export function ProfilePhotoThumbnail({
  src,
  isOwnedMedia,
  onUpload,
  onEditCrop,
  onDelete,
}: ProfilePhotoThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [hovering, setHovering] = useState(false);

  if (!src) {
    return (
      <button
        type="button"
        onClick={onUpload}
        className="bg-muted text-muted-foreground hover:bg-muted/80 flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed transition-colors"
        title="Upload profile photo"
      >
        <Camera className="h-6 w-6" />
      </button>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border bg-red-50 dark:bg-red-950">
        <ImageOff className="text-muted-foreground h-5 w-5" />
        <span className="text-muted-foreground text-[10px]">Unavailable</span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onUpload}
            title="Upload replacement"
          >
            <Upload className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onDelete}
            title="Remove photo reference"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative h-20 w-20 shrink-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      role="img"
      aria-label="Profile"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-20 w-20 rounded-md object-cover"
        onError={() => setHasError(true)}
      />
      {hovering && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-md bg-black/50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
            onClick={onUpload}
            title="Upload new photo"
          >
            <Upload className="h-4 w-4" />
          </Button>
          {isOwnedMedia && onEditCrop && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
              onClick={onEditCrop}
              title="Edit crop"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
            onClick={onDelete}
            title="Delete photo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
