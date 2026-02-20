export interface ImageResponse {
  id: number;
  albumId: number;
  r2Key: string;
  filename: string;
  takenAt: string | null;
  size: number;
  createdAt: string;
}

export interface PaginatedImagesResponse {
  data: ImageResponse[];
  nextOffset: number | null;
  hasMore: boolean;
}

export interface UploadImageMetadata {
  filename: string;
  takenAt: string | null;
}
