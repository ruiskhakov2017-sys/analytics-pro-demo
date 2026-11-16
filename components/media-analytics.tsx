"use client";
import { useEffect, useState } from "react";
type Overview = {
  total: number;
  limits: { withLimit: number; withoutLimit: number; highLimit: number };
  problematic: { count: number };
  byFarmer: Record<string, number>;
  banCorrelation: {
    toxicProxies: { proxy: string; banned: number }[];
    topBins: { bin: string; banned: number }[];
  };
};
export function MediaAnalytics({ revision }: { revision: unknown }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  if (error)
    return <p role="alert">Не удалось загрузить аналитику медиабаинга.</p>;
  if (!data) return <p>Загрузка аналитики…</p>;
  return (
    <section className="panel" style={{ marginBottom: 24 }}>
      <h2>Контроль медиабаинга</h2>
      <div className="metrics">
        {[
          ["Передано", data.total],
          ["С лимитом", data.limits.withLimit],
          ["Без лимита", data.limits.withoutLimit],
          ["Требуют внимания", data.problematic.count],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <h3>Распределение по ответственным</h3>
      {Object.entries(data.byFarmer).map(([name, count]) => (
        <div className="insight-row" key={name}>
          <p>{name}</p>
          <strong>{count}</strong>
        </div>
      ))}
      <h3>Связки с зафиксированными банами</h3>
      <p className="muted">
        Число банов по текущим BIN и провайдерам прокси. Совпадение фактора не
        доказывает, что именно он вызвал бан.
      </p>
      <div className="overview-grid">
        <div>
          <h4>Прокси-провайдеры</h4>
          {data.banCorrelation.toxicProxies.length ? (
            data.banCorrelation.toxicProxies.map((row) => (
              <div className="insight-row" key={row.proxy}>
                <span>{row.proxy}</span>
                <strong>{row.banned}</strong>
              </div>
            ))
          ) : (
            <p>Банов с указанным провайдером пока нет.</p>
          )}
        </div>
        <div>
          <h4>BIN карт</h4>
          {data.banCorrelation.topBins.length ? (
            data.banCorrelation.topBins.map((row) => (
              <div className="insight-row" key={row.bin}>
                <span>{row.bin}</span>
                <strong>{row.banned}</strong>
              </div>
            ))
          ) : (
            <p>Банов с указанным BIN пока нет.</p>
          )}
        </div>
      </div>
    </section>
  );
}
