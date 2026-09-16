import type { ReactElement } from 'react';
import { Head, Html, Main, NextScript } from 'next/document';

const basePath = process.env.NEXT_BASE_PATH || '';

export default function Document(): ReactElement {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        <script type="module" src={`${basePath}/__devframes/embedded.js`} />
      </body>
    </Html>
  );
}
