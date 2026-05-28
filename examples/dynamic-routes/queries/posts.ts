import { queryOptions } from '@tanstack/react-query';
import { fetchPosts, fetchPost } from '@/data/posts';

export const postsQuery = () =>
  queryOptions({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

export const postQuery = (id: string) =>
  queryOptions({
    queryKey: ['posts', id],
    queryFn: () => fetchPost(id),
  });
