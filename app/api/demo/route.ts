import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspace } from "@/lib/workspace";
import { accountInput, statusInput, transactionInput } from "@/lib/domain";
export const dynamic = "force-dynamic";
function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}
export async function GET() {
  try {
    const id = await workspace();
    const [accounts, transactions] = await Promise.all([
      db.account.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, geo: true, owner: true, status: true },
      }),
      db.transaction.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          kind: true,
          amount: true,
          createdAt: true,
        },
      }),
    ]);
    return response({ accounts, transactions });
  } catch (e) {
    return response(
      {
        error:
          e instanceof Error && e.message === "SESSION_REQUIRED"
            ? "Начните демосессию"
            : "База данных недоступна",
      },
      e instanceof Error && e.message === "SESSION_REQUIRED" ? 401 : 503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return response({ error: "Недопустимый источник запроса" }, 403);
  if (Number(req.headers.get("content-length") || 0) > 8192)
    return response({ error: "Слишком большой запрос" }, 413);
  try {
    const text = await req.text();
    if (text.length > 8192)
      return response({ error: "Слишком большой запрос" }, 413);
    const body = JSON.parse(text);
    if (body.action === "start") {
      await workspace(true);
      return response({ ok: true });
    }
    const id = await workspace();
    if (body.action === "account") {
      const data = accountInput.parse(body.data);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        if ((await tx.account.count({ where: { workspaceId: id } })) >= 100)
          throw new Error("LIMIT");
        await tx.account.create({ data: { ...data, workspaceId: id } });
      });
    } else if (body.action === "status") {
      const { id: accountId, status } = statusInput.parse(body.data);
      const result = await db.account.updateMany({
        where: { id: accountId, workspaceId: id },
        data: { status },
      });
      if (!result.count) return response({ error: "Аккаунт не найден" }, 404);
    } else if (body.action === "transaction") {
      const data = transactionInput.parse(body.data);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        if ((await tx.transaction.count({ where: { workspaceId: id } })) >= 200)
          throw new Error("LIMIT");
        await tx.transaction.create({ data: { ...data, workspaceId: id } });
      });
    } else return response({ error: "Неизвестное действие" }, 400);
    return response({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "LIMIT")
      return response({ error: "Достигнут лимит демосессии" }, 409);
    if (e instanceof Error && e.message === "SESSION_REQUIRED")
      return response({ error: "Сессия истекла. Обновите страницу." }, 401);
    return response(
      { error: "Операция не выполнена. Проверьте поля и подключение к базе." },
      400,
    );
  }
}
