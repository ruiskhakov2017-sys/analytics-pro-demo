import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Analytics Pro — демоплатформа",
  description: "Интерактивная CRM на вымышленных данных",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
