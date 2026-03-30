import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colabel",
  description: "Collaborative text annotation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
