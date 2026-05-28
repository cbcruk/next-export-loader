import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader } from 'next-export-loader';
import { booksSearchQuery } from '@/queries/books';

export default function SearchPage(): ReactElement {
  const router = useRouter();
  const q = typeof router.query.q === 'string' ? router.query.q : '';
  const { data: results } = useSuspenseQuery(booksSearchQuery(q));
  const [input, setInput] = useState(q);

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1>Book Search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void router.push(`/search?q=${encodeURIComponent(input)}`);
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search books..."
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 16,
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              fontSize: 16,
              background: '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </div>
      </form>
      <p style={{ color: '#666', marginBottom: 16 }}>
        {results.length} result{results.length !== 1 ? 's' : ''}
        {q ? ` for "${q}"` : ''}
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results.map((book) => (
          <li
            key={book.id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <strong>{book.title}</strong>
            <span style={{ color: '#666', marginLeft: 8 }}>
              by {book.author}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

SearchPage.loader = defineLoader(async ({ query, queryClient }) => {
  const q = typeof query.q === 'string' ? query.q : '';
  await queryClient.ensureQueryData(booksSearchQuery(q));
});
