"use client";
import { useEffect, useState, type FormEvent } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  Layers,
  ArrowUpRight,
  Wallet,
  Sparkles,
  Plus,
  X,
  Settings,
} from "lucide-react";
import { summarize, insights, statuses } from "@/lib/domain";
import { AccountAnalytics } from "./account-analytics";
type Account = {
  history: {
    id: string;
    previousStatus: string | null;
    status: string;
    createdAt: string;
  }[];
  id: string;
  name: string;
  geo: string;
  owner: string;
  dailyLimit: number;
  quality: string;
  status: string;
};
type Transaction = {
  id: string;
  title: string;
  kind: string;
  department: string;
  amount: number;
  createdAt: string;
};
type Data = { accounts: Account[]; transactions: Transaction[] };
const sections = [
  ["overview", "Обзор", LayoutDashboard],
  ["farming", "Фарм-отдел", Layers],
  ["buying", "Медиабаинг", ArrowUpRight],
  ["finance", "Финансы", Wallet],
  ["ai", "AI-аналитика", Sparkles],
  ["settings", "Настройки", Settings],
] as const;
const money = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export default function Dashboard() {
  const [data, setData] = useState<Data>({ accounts: [], transactions: [] });
  const [page, setPage] = useState("overview");
  const [theme, setTheme] = useState("light");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [accountTab, setAccountTab] = useState("all");
  const [financeTab, setFinanceTab] = useState("ALL");
  async function refresh() {
    const r = await fetch("/api/demo", { cache: "no-store" });
    const body = await r.json();
    if (!r.ok) throw Error(body.error);
    setData(body);
  }
  async function command(action: string, values?: unknown) {
    const r = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data: values }),
    });
    const body = await r.json();
    if (!r.ok) throw Error(body.error);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await command("start");
        if (active) await refresh();
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить данные",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function mutate(action: string, values: unknown) {
    setBusy(true);
    setError("");
    try {
      await command(action, values);
      await refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    if (page === "finance")
      void mutate("transaction", {
        title: fields.get("title"),
        kind: fields.get("kind"),
        department: fields.get("department"),
        amount: Math.round(Number(fields.get("amount")) * 100),
      });
    else
      void mutate("account", {
        name: fields.get("name"),
        geo: fields.get("geo"),
        owner: fields.get("owner"),
        dailyLimit: Math.round(Number(fields.get("dailyLimit")) * 100),
        quality: fields.get("quality"),
      });
  }
  const financeRows = data.transactions.filter(
    (t) => financeTab === "ALL" || t.department === financeTab,
  );
  const summary = summarize(
    page === "finance" ? financeRows : data.transactions,
  );
  const visible = data.accounts.filter(
    (a) =>
      (page !== "buying" || a.status === "В работе") &&
      (page !== "farming" ||
        accountTab === "all" ||
        (accountTab === "ready" && a.status === "Готов") ||
        (accountTab === "work" && ["Прогрев", "Проверка"].includes(a.status)) ||
        (accountTab === "transferred" && a.status === "В работе")) &&
      `${a.name} ${a.geo} ${a.owner}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const daily = Object.values(
    data.transactions.reduce<
      Record<string, { date: string; income: number; expense: number }>
    >((acc, t) => {
      const key = t.createdAt.slice(0, 10);
      acc[key] ??= { date: key, income: 0, expense: 0 };
      if (t.kind === "income") acc[key].income += t.amount / 100;
      else acc[key].expense += t.amount / 100;
      return acc;
    }, {}),
  ).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div data-theme={theme} className="application">
      <aside>
        <a href="#" className="brand">
          <span className="logo">a↗</span>analytics <small>pro</small>
        </a>
        <div className="workspace-label">
          NOVA WORKSPACE <span>ОПЕРАЦИОННАЯ ПЛАТФОРМА</span>
        </div>
        <nav>
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={page === id ? "page" : undefined}
              onClick={() => {
                setPage(id);
                setQuery("");
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles />
          <h3>
            Ясная картина.
            <br />
            Точные решения.
          </h3>
          <p>Аккаунты, команда и финансы в одном рабочем пространстве.</p>
        </div>
      </aside>
      <div className="content">
        <header>
          <span>
            Рабочее пространство /{" "}
            <b>{sections.find((s) => s[0] === page)?.[1]}</b>
          </span>
          <label>
            Концепция{" "}
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="light">01 · Minimal</option>
              <option value="dark">02 · Drive</option>
              <option value="editorial">03 · Luxury</option>
            </select>
          </label>
        </header>
        <main>
          <div className="heading">
            <div>
              <span className="eyebrow">ANALYTICS PRO / ОБЩАЯ КАРТИНА</span>
              <h1>
                {page === "overview"
                  ? "Всё важное. В одном месте."
                  : sections.find((s) => s[0] === page)?.[1]}
              </h1>
              <p>От подготовки аккаунта до финансового результата.</p>
            </div>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}{" "}
              <button onClick={() => location.reload()}>
                Повторить загрузку
              </button>
            </div>
          )}
          {loading ? (
            <p role="status">Подготавливаем ваше пространство…</p>
          ) : (
            <>
              <div className="metrics">
                {[
                  ["Доход", money(summary.income)],
                  ["Расход", money(summary.expense)],
                  ["Чистая прибыль", money(summary.profit)],
                  [
                    "ROI",
                    summary.roi === null ? "Нет расходов" : `${summary.roi}%`,
                  ],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>Все сохранённые операции</small>
                  </article>
                ))}
              </div>
              {page === "overview" && (
                <>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">ЭФФЕКТИВНОСТЬ</span>
                          <h2>Рост — это система.</h2>
                        </div>
                        <span className="muted">Доход / расход · USD</span>
                      </div>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={daily}>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area
                              name="Доход"
                              dataKey="income"
                              stroke="var(--accent)"
                              fill="var(--soft)"
                              dot
                            />
                            <Area
                              name="Расход"
                              dataKey="expense"
                              stroke="#91a0b7"
                              fill="transparent"
                              dot
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <small className="muted">
                        График построен по сохранённым операциям, без
                        искусственных точек.
                      </small>
                    </section>
                    <section className="insight">
                      <Sparkles />
                      <h2>
                        Меньше шума.
                        <br />
                        Больше результата.
                      </h2>
                      <p>{insights(data.accounts, data.transactions)[0]}</p>
                      <button onClick={() => setPage("ai")}>
                        Разобрать показатели ↗
                      </button>
                    </section>
                  </div>
                  <h2 className="section-title">Направления</h2>
                  <div className="departments">
                    {sections.slice(1, 5).map(([id, label, Icon], i) => (
                      <motion.button
                        whileHover={{ y: -4 }}
                        key={id}
                        onClick={() => setPage(id)}
                      >
                        <Icon />
                        <span>0{i + 1} ↗</span>
                        <h3>{label}</h3>
                        <p>
                          {
                            [
                              "Подготовка и передача",
                              "Кампании и ответственность",
                              "Экономика каждого решения",
                              "Выводы на ваших данных",
                            ][i]
                          }
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
              {page === "farming" && (
                <AccountAnalytics accounts={data.accounts} />
              )}
              {page === "settings" ? (
                <section className="panel">
                  <h2>Интеграции</h2>
                  <p>Состояние подключений рабочего пространства.</p>
                  {["Google Ads", "Airtable", "Почта", "AI-провайдер"].map(
                    (name) => (
                      <div className="insight-row" key={name}>
                        <h3>{name}</h3>
                        <span className="muted">Не подключено</span>
                      </div>
                    ),
                  )}
                </section>
              ) : page === "ai" ? (
                <section className="panel">
                  <span className="eyebrow">ОПЕРАЦИОННАЯ СВОДКА</span>
                  <h2>Что важно сейчас</h2>
                  {insights(data.accounts, data.transactions).map((text, i) => (
                    <article className="insight-row" key={text}>
                      <strong>0{i + 1}</strong>
                      <p>{text}</p>
                    </article>
                  ))}
                </section>
              ) : (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      {page === "finance"
                        ? "Финансовые операции"
                        : page === "buying"
                          ? "Аккаунты в медиабаинге"
                          : "Аккаунты команды"}
                    </h2>
                    <Dialog.Root open={open} onOpenChange={setOpen}>
                      <Dialog.Trigger
                        className="primary"
                        disabled={busy || !!error}
                      >
                        <Plus size={15} />
                        {page === "finance" ? "Операция" : "Аккаунт"}
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="overlay" />
                        <Dialog.Content className="modal">
                          <Dialog.Title>
                            {page === "finance"
                              ? "Новая операция"
                              : "Новый аккаунт"}
                          </Dialog.Title>
                          <Dialog.Description>
                            Заполните поля для сохранения в рабочем
                            пространстве.
                          </Dialog.Description>
                          <form onSubmit={submit}>
                            {page === "finance" ? (
                              <>
                                <label>
                                  Описание
                                  <input
                                    name="title"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                  />
                                </label>
                                <label>
                                  Тип
                                  <select name="kind">
                                    <option value="expense">Расход</option>
                                    <option value="income">Доход</option>
                                  </select>
                                </label>
                                <label>
                                  Сумма, USD
                                  <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    max="1000000"
                                    step="0.01"
                                    required
                                  />
                                </label>
                                <label>
                                  Отдел
                                  <select
                                    name="department"
                                    defaultValue={
                                      financeTab === "ALL"
                                        ? "GENERAL"
                                        : financeTab
                                    }
                                  >
                                    <option value="GENERAL">Общее</option>
                                    <option value="FARMING">Фарминг</option>
                                    <option value="MEDIABUYING">
                                      Медиабаинг
                                    </option>
                                  </select>
                                </label>
                              </>
                            ) : (
                              <>
                                <label>
                                  Название
                                  <input
                                    name="name"
                                    required
                                    minLength={2}
                                    maxLength={80}
                                  />
                                </label>
                                <label>
                                  География
                                  <input
                                    name="geo"
                                    required
                                    minLength={2}
                                    maxLength={40}
                                  />
                                </label>
                                <label>
                                  Ответственный
                                  <input
                                    name="owner"
                                    required
                                    minLength={2}
                                    maxLength={40}
                                  />
                                </label>
                                <label>
                                  Дневной лимит, USD
                                  <input
                                    name="dailyLimit"
                                    type="number"
                                    min="0"
                                    max="1000000"
                                    step="0.01"
                                    defaultValue="0"
                                    required
                                  />
                                </label>
                                <label>
                                  Качество
                                  <select name="quality">
                                    <option>Не оценено</option>
                                    <option>Высокое</option>
                                    <option>Стандартное</option>
                                    <option>Риск</option>
                                  </select>
                                </label>
                              </>
                            )}
                            {error && <p role="alert">{error}</p>}
                            <button className="primary" disabled={busy}>
                              {busy ? "Сохраняем…" : "Сохранить"}
                            </button>
                          </form>
                          <Dialog.Close className="close" aria-label="Закрыть">
                            <X />
                          </Dialog.Close>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  </div>
                  {page === "farming" && (
                    <div className="account-tabs" aria-label="Группы аккаунтов">
                      {[
                        ["all", "Все аккаунты"],
                        ["work", "В работе фарма"],
                        ["ready", "Готовы к передаче"],
                        ["transferred", "Переданы"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          aria-pressed={accountTab === id}
                          onClick={() => setAccountTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {page === "finance" && (
                    <div
                      className="account-tabs"
                      aria-label="Финансовые отделы"
                    >
                      {[
                        ["ALL", "P&L сводка"],
                        ["FARMING", "Фарминг"],
                        ["MEDIABUYING", "Медиабаинг"],
                        ["GENERAL", "Общее"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          aria-pressed={financeTab === id}
                          onClick={() => setFinanceTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {page === "finance" ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Операция</th>
                            <th>Дата</th>
                            <th>Тип</th>
                            <th>Сумма</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeRows.map((t) => (
                            <tr key={t.id}>
                              <td>{t.title}</td>
                              <td>
                                {new Date(t.createdAt).toLocaleDateString(
                                  "ru-RU",
                                )}
                              </td>
                              <td>
                                {t.kind === "income" ? "Доход" : "Расход"}
                              </td>
                              <td>{money(t.amount)}</td>
                              <td>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  aria-label={`Удалить ${t.title}`}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Удалить операцию «${t.title}»?`,
                                      )
                                    )
                                      void mutate("transaction-delete", {
                                        id: t.id,
                                      });
                                  }}
                                >
                                  Удалить
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <>
                      <input
                        className="search"
                        aria-label="Поиск аккаунтов"
                        placeholder="Поиск по названию, географии или участнику"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Аккаунт</th>
                              <th>География</th>
                              <th>Ответственный</th>
                              <th>Этап</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <button
                                    className="account-link"
                                    onClick={() => setSelected(a)}
                                  >
                                    {a.name}
                                  </button>
                                </td>
                                <td>{a.geo}</td>
                                <td>{a.owner}</td>
                                <td>
                                  <select
                                    aria-label={`Статус ${a.name}`}
                                    value={a.status}
                                    disabled={busy}
                                    onChange={(e) =>
                                      void mutate("status", {
                                        id: a.id,
                                        status: e.target.value,
                                      })
                                    }
                                  >
                                    {statuses.map((s) => (
                                      <option key={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  {a.status === "Готов" && (
                                    <button
                                      className="text-button"
                                      disabled={busy}
                                      onClick={() =>
                                        void mutate("status", {
                                          id: a.id,
                                          status: "В работе",
                                        })
                                      }
                                    >
                                      Передать ↗
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {visible.length === 0 && (
                          <p className="empty">
                            Аккаунтов пока нет. Создайте аккаунт или передайте
                            готовый из фарм-отдела.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
            </>
          )}
          <footer>Analytics Pro · Рабочее пространство</footer>
        </main>
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="modal">
            <Dialog.Title>{selected?.name}</Dialog.Title>
            <Dialog.Description>Карточка аккаунта</Dialog.Description>
            <p>География: {selected?.geo}</p>
            <p>Ответственный: {selected?.owner}</p>
            <p>
              Дневной лимит:{" "}
              {selected?.dailyLimit ? money(selected.dailyLimit) : "Не задан"}
            </p>
            <p>Качество: {selected?.quality}</p>
            <p>Этап: {selected?.status}</p>
            <h3>История аккаунта</h3>
            <p className="muted">Последние 100 событий</p>
            {selected?.history.length ? (
              selected.history.map((event) => (
                <div className="insight-row" key={event.id}>
                  <div>
                    <p>
                      {event.previousStatus
                        ? `${event.previousStatus} → ${event.status}`
                        : `Создан: ${event.status}`}
                    </p>
                    <time className="muted" dateTime={event.createdAt}>
                      {new Date(event.createdAt).toLocaleString("ru-RU")}
                    </time>
                  </div>
                </div>
              ))
            ) : (
              <p>Изменения ещё не зарегистрированы.</p>
            )}
            <Dialog.Close className="close" aria-label="Закрыть">
              <X />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
