export interface ImageResponse {
  id: number;
  albumId: number;
  r2Key: string;
  filename: string;
  takenAt: string | null;
  size: number;
  mediaType: 'image' | 'video' | 'file';
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

export interface UploadStartRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface UploadStartResponse {
  uploadId: string;
  r2Key: string;
}

export interface UploadPartResponse {
  partNumber: number;
  etag: string;
}

export interface UploadConfirmRequest {
  uploadId: string;
  r2Key: string;
  filename: string;
  takenAt: string | null;
  size: number;
  mediaType: 'image' | 'video' | 'file';
  parts: { partNumber: number; etag: string }[];
}
