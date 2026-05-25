'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import type { CropRect } from '@/lib/api';

interface ProfilePhotoCropDialogProps {
  open: boolean;
  imageUrl: string;
  initialCrop?: CropRect | null;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
  confirming?: boolean;
}

export function ProfilePhotoCropDialog({
  open,
  imageUrl,
  initialCrop,
  onConfirm,
  onCancel,
  confirming = false,
}: ProfilePhotoCropDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>(() => {
    if (initialCrop) {
      return {
        unit: 'px',
        x: initialCrop.x,
        y: initialCrop.y,
        width: initialCrop.width,
        height: initialCrop.height,
      };
    }
    return { unit: '%', x: 10, y: 10, width: 80, height: 80 } as Crop;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (initialCrop) {
      setCrop({
        unit: 'px',
        x: initialCrop.x,
        y: initialCrop.y,
        width: initialCrop.width,
        height: initialCrop.height,
      });
    }
  }, [initialCrop]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (initialCrop) return;
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const size = Math.min(naturalWidth, naturalHeight);
      const x = Math.round((naturalWidth - size) / 2);
      const y = Math.round((naturalHeight - size) / 2);
      setCrop({ unit: 'px', x, y, width: size, height: size });
    },
    [initialCrop],
  );

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    let pixelCrop: CropRect;

    if (crop.unit === '%') {
      pixelCrop = {
        x: Math.round((crop.x / 100) * img.naturalWidth),
        y: Math.round((crop.y / 100) * img.naturalHeight),
        width: Math.round((crop.width / 100) * img.naturalWidth),
        height: Math.round((crop.height / 100) * img.naturalHeight),
      };
    } else {
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      pixelCrop = {
        x: Math.round(crop.x * scaleX),
        y: Math.round(crop.y * scaleY),
        width: Math.round(crop.width * scaleX),
        height: Math.round(crop.height * scaleY),
      };
    }

    onConfirm(pixelCrop);
  };

  return (
    <dialog
      ref={dialogRef}
      className="bg-background fixed left-1/2 top-1/2 w-[min(100%,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg backdrop:bg-black/50"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 className="text-lg font-semibold">Crop profile photo</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Drag to adjust the crop area. The photo will be displayed as a square.
      </p>
      <div className="mt-4 flex justify-center">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          aspect={1}
          minWidth={32}
          minHeight={32}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop preview"
            className="max-h-80"
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
          Cancel
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={confirming}>
          {confirming ? 'Applying…' : 'Apply crop'}
        </Button>
      </div>
    </dialog>
  );
}
