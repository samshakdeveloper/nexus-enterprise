import type { ReactNode } from "react";

export const metadata = { title: "Nexus — Create User", description: "Reference client for the CreateUser use case" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0b0d12", color: "#e6e8ee", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
