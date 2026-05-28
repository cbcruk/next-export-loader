import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader, RedirectError } from 'next-export-loader';
import { postQuery } from '@/queries/posts';

export default function PostDetailPage(): ReactElement {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const { data: post } = useSuspenseQuery(postQuery(id));

  return (
    <div style={{ padding: 32 }}>
      <Link href="/posts" style={{ color: '#0070f3' }}>
        &larr; Back to posts
      </Link>
      <h1 style={{ marginTop: 16 }}>{post?.title}</h1>
      <p style={{ lineHeight: 1.6 }}>{post?.body}</p>
    </div>
  );
}

PostDetailPage.loader = defineLoader(async ({ query, queryClient }) => {
  const id = typeof query.id === 'string' ? query.id : '';

  if (!id) {
    throw new RedirectError('/posts');
  }

  const post = await queryClient.ensureQueryData(postQuery(id));

  if (!post) {
    throw new Error('Post not found');
  }
});
