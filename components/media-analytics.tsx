"use client";
import { useEffect, useState } from "react";
type Overview = {
  total: number;
  limits: { withLimit: number; withoutLimit: number; highLimit: number };
  problematic: { count: number };
  byFarmer: Record<string, number>;
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
    </section>
  );
}
