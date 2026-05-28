export interface Book {
  id: string;
  title: string;
  author: string;
}

const BOOKS: Book[] = [
  { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
  { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee' },
  { id: '3', title: '1984', author: 'George Orwell' },
  { id: '4', title: 'Pride and Prejudice', author: 'Jane Austen' },
  { id: '5', title: 'The Catcher in the Rye', author: 'J.D. Salinger' },
  { id: '6', title: 'Great Expectations', author: 'Charles Dickens' },
  { id: '7', title: 'The Great Train Robbery', author: 'Michael Crichton' },
  { id: '8', title: 'Brave New World', author: 'Aldous Huxley' },
];

export async function searchBooks(query: string): Promise<Book[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!query) return BOOKS;
  const lower = query.toLowerCase();
  return BOOKS.filter(
    (b) =>
      b.title.toLowerCase().includes(lower) ||
      b.author.toLowerCase().includes(lower),
  );
}
