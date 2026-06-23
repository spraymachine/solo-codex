export interface BookSearchResult {
  volumeId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
}
