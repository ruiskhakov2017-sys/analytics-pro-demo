"use client";
import { useState } from "react";
import { farmingFunnel, farmingLimitAnalytics } from "@/lib/domain";
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
  dailyLimit: number;
  quality: string;
  proxyProvider: string;
  warmupScheme: string;
  additionalFarming: boolean;
  createdAt: string;
  limitHistory: { limit: number; createdAt: string }[];
};
export function AccountAnalytics({ accounts }: { accounts: Account[] }) {
  const [tab, setTab] = useState("live");
  const funnel = farmingFunnel(accounts);
  const limitAnalytics = farmingLimitAnalytics(accounts);
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
          ["limits", "Лимиты"],
          ["funnel", "Воронка"],
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
            {["Прогрев", "Готов", "В работе", "Проверка", "Бан"].map((status) => (
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
      {tab === "limits" && (
        <>
          <h2>Дневные лимиты аккаунтов</h2>
          <p className="muted">
            История сохраняется при создании аккаунта и каждом изменении лимита.
            Сейчас записей: {limitAnalytics.historyCount}.
          </p>
          <div className="metrics">
            {[
              ["Дней до $250", limitAnalytics.timeToLimit.gt250.avgDays, limitAnalytics.timeToLimit.gt250.count],
              ["Дней до $1 000", limitAnalytics.timeToLimit.gt1000.avgDays, limitAnalytics.timeToLimit.gt1000.count],
            ].map(([label, days, count]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{count ? days : "Нет данных"}</strong>
                <small>Аккаунтов с зафиксированным достижением: {count}</small>
              </article>
            ))}
          </div>
          <h3>Скорость роста лимита</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Интервал</th><th>Аккаунты</th><th>Среднее время, дней</th></tr>
              </thead>
              <tbody>
                {Object.entries(limitAnalytics.stepDurations).map(([step, row]) => (
                  <tr key={step}><td>${step.replace("to", " → $")}</td><td>{row.count}</td><td>{row.count ? row.avgDays : "Нет данных"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Связки по наблюдавшимся лимитам</h3>
          <p className="muted">Среднее рассчитано по последней записи лимита каждого аккаунта в связке.</p>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Прокси</th><th>Схема</th><th>Дофарм</th><th>Аккаунты</th><th>Средний лимит</th></tr></thead>
              <tbody>
                {limitAnalytics.bundles.map((row) => (
                  <tr key={`${row.proxy}-${row.scheme}-${row.additionalFarming}`}>
                    <td>{row.proxy}</td><td>{row.scheme}</td><td>{row.additionalFarming ? "Да" : "Нет"}</td><td>{row.count}</td><td>{(row.avgLimit / 100).toLocaleString("ru-RU", { style: "currency", currency: "USD" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!limitAnalytics.bundles.length && <p>Связки появятся после накопления истории лимитов.</p>}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Аккаунт</th>
                  <th>Качество</th>
                  <th>Лимит, USD</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.quality}</td>
                    <td>
                      {a.dailyLimit
                        ? (a.dailyLimit / 100).toLocaleString("ru-RU", {
                            minimumFractionDigits: 2,
                          })
                        : "Не задан"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "funnel" && (
        <>
          <h2>Прохождение этапов</h2>
          <p className="muted">
            Показатели строятся по текущему составу демосессии и сохранённой
            истории аккаунтов.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Этап</th>
                  <th>Аккаунты</th>
                  <th>От предыдущего этапа</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => (
                  <tr key={row.stage}>
                    <td>{row.stage}</td>
                    <td>{row.count}</td>
                    <td>{row.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            .filter((a) => a.status === "Проверка" || a.status === "Бан")
            .map((a) => (
              <div className="insight-row" key={a.id}>
                <strong>{a.name}</strong>
                <p>
                  {a.geo} · {a.owner} · {a.status}
                </p>
              </div>
            ))}
          {!accounts.some((a) => a.status === "Проверка" || a.status === "Бан") && (
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
