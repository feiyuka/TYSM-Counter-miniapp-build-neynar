import type { AppProps } from "next/app";

// This file exists solely to ensure Next.js generates pages-manifest.json
// during the build. Without at least one Pages Router file, Next.js 16
// skips generating pages-manifest.json which causes a build-time ENOENT error.
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
