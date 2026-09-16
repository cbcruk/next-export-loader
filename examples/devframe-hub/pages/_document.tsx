import type { ReactElement } from 'react';
import { Head, Html, Main, NextScript } from 'next/document';

const basePath = process.env.NEXT_BASE_PATH || '';
const isDevelopment = process.env.NODE_ENV === 'development';

export default function Document(): ReactElement {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        {isDevelopment && (
          <script type="module" src={`${basePath}/__devframes/embedded.js`} />
        )}
      </body>
    </Html>
  );
}
