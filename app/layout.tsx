import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EDGE Hockey Performance Coach',
  description: 'Turn hockey tracking data into measurable player development.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
