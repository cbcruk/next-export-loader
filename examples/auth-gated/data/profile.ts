export interface Profile {
  name: string;
  email: string;
  role: string;
}

export async function fetchProfile(): Promise<Profile> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'Admin',
  };
}
