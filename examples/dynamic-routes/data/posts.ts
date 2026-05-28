export interface Post {
  id: string;
  title: string;
  body: string;
}

const POSTS: Post[] = [
  { id: '1', title: 'Hello World', body: 'Welcome to the blog. This is the first post.' },
  { id: '2', title: 'Getting Started with Next.js', body: 'Next.js is a React framework for building web applications.' },
  { id: '3', title: 'Understanding Loaders', body: 'Loaders run before your component mounts, ensuring data is ready.' },
];

export async function fetchPosts(): Promise<Post[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return POSTS;
}

export async function fetchPost(id: string): Promise<Post | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return POSTS.find((p) => p.id === id);
}
