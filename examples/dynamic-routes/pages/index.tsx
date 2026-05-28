import type { ReactElement } from 'react';
import { PrefetchLink } from 'next-export-loader';
import { postsQuery } from '@/queries/posts';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>Dynamic Routes Example</h1>
      <p>
        <PrefetchLink href="/posts" prefetch={[postsQuery()]}>
          Go to Posts
        </PrefetchLink>
      </p>
    </div>
  );
}
