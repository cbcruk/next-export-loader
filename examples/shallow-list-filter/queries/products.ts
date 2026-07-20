import { queryOptions } from '@tanstack/react-query';
import { fetchProducts } from '@/data/products';

export const productsQuery = () =>
  queryOptions({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
