import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/providers/Providers";

// Use local fonts instead of Google Fonts to avoid network issues
const inter = localFont({
  src: '../fonts/Inter-Regular.woff2',
  variable: "--font-inter",
});

const jetbrainsMono = localFont({
  src: '../fonts/JetBrainsMono-Regular.woff2',
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Multi-Agent Canvas",
  description: "A powerful multi-agent chat interface for specialized AI assistants",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground transition-colors duration-300`}
      >
        <ClientErrorBoundary>
          <Providers>{children}</Providers>
        </ClientErrorBoundary>
        <Toaster />

        {/* Add script to handle chunk loading errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add global error handler for chunk loading errors
              window.addEventListener('error', function(event) {
                if (event.error &&
                   (event.error.message && event.error.message.includes('ChunkLoadError') ||
                    event.error.message && event.error.message.includes('Loading chunk') ||
                    event.error.stack && event.error.stack.includes('webpack'))) {
                  console.log('Caught chunk loading error in global handler, attempting recovery');

                  // Clear localStorage cache related to Next.js
                  Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('next-') || key.includes('chunk') || key.includes('webpack')) {
                      localStorage.removeItem(key);
                    }
                  });

                  // Reload the page after a short delay
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);

                  // Prevent the error from bubbling up
                  event.preventDefault();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
