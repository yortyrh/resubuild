import { IsInt, Min } from 'class-validator';

/** Crop rectangle in original-image pixel coordinates (origin top-left). */
export class CropRectDto {
  @IsInt()
  @Min(0)
  x!: number;

  @IsInt()
  @Min(0)
  y!: number;

  @IsInt()
  @Min(1)
  width!: number;

  @IsInt()
  @Min(1)
  height!: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaMetaDto {
  id: string;
  contentType: string;
  crop: CropRect | null;
  hasCropped: boolean;
}
