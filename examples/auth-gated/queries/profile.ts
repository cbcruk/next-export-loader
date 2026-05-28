import { queryOptions } from '@tanstack/react-query';
import { fetchProfile } from '@/data/profile';

export const profileQuery = () =>
  queryOptions({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
