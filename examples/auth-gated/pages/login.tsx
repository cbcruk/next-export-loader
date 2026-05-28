import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { login } from '@/data/auth';

export default function LoginPage(): ReactElement {
  const router = useRouter();

  function handleLogin(): void {
    login();
    router.push('/dashboard');
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Login</h1>
      <p>You must log in to access the dashboard.</p>
      <button type="button" onClick={handleLogin}>
        Login
      </button>
      <p style={{ marginTop: 16 }}>
        <Link href="/">Back to Home</Link>
      </p>
    </div>
  );
}
