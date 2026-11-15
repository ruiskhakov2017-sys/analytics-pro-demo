"use client";
import { useState } from "react";
type Event = {
  id: string;
  previousStatus: string | null;
  status: string;
  createdAt: string;
};
type Account = {
  id: string;
  name: string;
  owner: string;
  geo: string;
  status: string;
  history: Event[];
};
export function AccountAnalytics({ accounts }: { accounts: Account[] }) {
  const [tab, setTab] = useState("live");
  const events = accounts
    .flatMap((a) =>
      a.history.map((e) => ({ ...e, name: a.name, owner: a.owner })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const owners = [...new Set(accounts.map((a) => a.owner))].sort();
  return (
    <section className="panel" style={{ marginBottom: 24 }}>
      <div className="account-tabs" aria-label="Аналитика фарм-отдела">
        {[
          ["live", "Live Сводка"],
          ["efficiency", "Эффективность"],
          ["quality", "Качество и проверки"],
          ["history", "История аккаунтов"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "live" && (
        <>
          <h2>Распределение аккаунтов</h2>
          <div className="metrics">
            {["Прогрев", "Готов", "В работе", "Проверка"].map((status) => (
              <article key={status}>
                <span>{status}</span>
                <strong>
                  {accounts.filter((a) => a.status === status).length}
                </strong>
                <small>Текущее состояние</small>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "efficiency" && (
        <>
          <h2>Результаты команды</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ответственный</th>
                  <th>Всего</th>
                  <th>Готовы</th>
                  <th>Переданы</th>
                  <th>Доля переданных</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => {
                  const rows = accounts.filter((a) => a.owner === owner);
                  const transferred = rows.filter(
                    (a) => a.status === "В работе",
                  ).length;
                  return (
                    <tr key={owner}>
                      <td>{owner}</td>
                      <td>{rows.length}</td>
                      <td>{rows.filter((a) => a.status === "Готов").length}</td>
                      <td>{transferred}</td>
                      <td>{Math.round((transferred / rows.length) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "quality" && (
        <>
          <h2>Аккаунты, требующие внимания</h2>
          {accounts
            .filter((a) => a.status === "Проверка")
            .map((a) => (
              <div className="insight-row" key={a.id}>
                <strong>{a.name}</strong>
                <p>
                  {a.geo} · {a.owner}
                </p>
              </div>
            ))}
          {!accounts.some((a) => a.status === "Проверка") && (
            <p>Нет аккаунтов в статусе «Проверка».</p>
          )}
        </>
      )}
      {tab === "history" && (
        <>
          <h2>Изменения аккаунтов</h2>
          <p className="muted">До 100 последних событий каждого аккаунта.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Аккаунт</th>
                  <th>Изменение</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleString("ru-RU")}</td>
                    <td>{e.name}</td>
                    <td>
                      {e.previousStatus
                        ? `${e.previousStatus} → ${e.status}`
                        : `Создан: ${e.status}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!events.length && <p>Изменения ещё не зарегистрированы.</p>}
        </>
      )}
    </section>
  );
}
