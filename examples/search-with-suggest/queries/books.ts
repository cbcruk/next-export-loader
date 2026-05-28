import { queryOptions } from '@tanstack/react-query';
import { searchBooks } from '@/data/books';

export const booksSearchQuery = (q: string) =>
  queryOptions({
    queryKey: ['books', 'search', q],
    queryFn: () => searchBooks(q),
  });
