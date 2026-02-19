export interface AlbumRequest {
  name: string;
}

export interface AlbumResponse {
  id: number;
  name: string;
  createdAt: string;
  imageCount: number;
  coverKey: string | null;
}
