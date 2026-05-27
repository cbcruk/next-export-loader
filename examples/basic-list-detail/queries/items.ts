import { queryOptions } from '@tanstack/react-query';
import { fetchItems } from '@/data/items';

export const itemsQuery = () =>
  queryOptions({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
