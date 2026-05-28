import type { ReactElement } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader, PrefetchLink } from 'next-export-loader';
import { postsQuery, postQuery } from '@/queries/posts';

export default function PostsPage(): ReactElement {
  const { data: posts } = useSuspenseQuery(postsQuery());

  return (
    <div style={{ padding: 32 }}>
      <h1>Posts</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map((post) => (
          <li key={post.id} style={{ marginBottom: 12 }}>
            <PrefetchLink
              href={`/posts/detail?id=${post.id}`}
              prefetch={[postQuery(post.id)]}
              style={{ color: '#0070f3', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {post.title}
            </PrefetchLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

PostsPage.loader = defineLoader(async ({ queryClient }) => {
  await queryClient.ensureQueryData(postsQuery());
});
