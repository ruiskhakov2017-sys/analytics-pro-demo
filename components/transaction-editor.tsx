"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
type Row = {
  id: string;
  title: string;
  kind: string;
  department: string;
  amount: number;
};
export function TransactionEditor({
  row,
  onSaved,
}: {
  row: Row;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="text-button"
        aria-label={`Изменить ${row.title}`}
      >
        Изменить
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Изменить операцию</Dialog.Title>
          <Dialog.Description>
            Изменения сохраняются в журнале операций.
          </Dialog.Description>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                const r = await fetch("/api/demo", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "transaction-edit",
                    data: {
                      id: row.id,
                      title: f.get("title"),
                      kind: f.get("kind"),
                      department: f.get("department"),
                      amount: Math.round(Number(f.get("amount")) * 100),
                    },
                  }),
                });
                if (!r.ok) throw Error((await r.json()).error);
                await onSaved();
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Ошибка сохранения");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Описание
              <input
                name="title"
                defaultValue={row.title}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label>
              Сумма, USD
              <input
                name="amount"
                type="number"
                defaultValue={row.amount / 100}
                min="0.01"
                max="1000000"
                step="0.01"
                required
              />
            </label>
            <label>
              Тип
              <select name="kind" defaultValue={row.kind}>
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
            </label>
            <label>
              Отдел
              <select name="department" defaultValue={row.department}>
                <option value="GENERAL">Общее</option>
                <option value="FARMING">Фарминг</option>
                <option value="MEDIABUYING">Медиабаинг</option>
              </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary" disabled={busy}>
              Сохранить изменения
            </button>
          </form>
          <Dialog.Close className="close" aria-label="Закрыть">
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
