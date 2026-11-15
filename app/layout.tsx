import type { Metadata } from "next";
import "./globals.css";
import "./concepts.css";
export const metadata: Metadata = {
  title: "Analytics Pro — управление командой и аналитика",
  description:
    "Аккаунты, медиабаинг и финансовые расчёты в одном рабочем пространстве",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
