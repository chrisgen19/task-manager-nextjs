import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager Pro",
  description: "A full-featured task manager with List, Kanban, Calendar, and Timeline views.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const accent = cookieStore.get("accentColor")?.value;

  return (
    <html
      lang="en"
      className={theme === "light" ? "light" : undefined}
      data-accent={accent || undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Fallback for first visit before cookies exist */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(document.documentElement.className.indexOf('light')===-1){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')}if(!document.documentElement.getAttribute('data-accent')){var a=localStorage.getItem('accentColor');if(a)document.documentElement.setAttribute('data-accent',a)}}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
