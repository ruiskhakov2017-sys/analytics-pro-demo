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
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === req.headers.get("host")
    );
  } catch {
    return false;
  }
}
export async function GET() {
  try {
    const id = await workspace();
    const [accounts, transactions, templates, audit] = await Promise.all([
      db.account.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          geo: true,
          owner: true,
          dailyLimit: true,
          quality: true,
          status: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
              id: true,
              previousStatus: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      db.transaction.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          kind: true,
          department: true,
          amount: true,
          createdAt: true,
        },
      }),
      db.financeTemplate.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          kind: true,
          department: true,
          amount: true,
        },
      }),
      db.auditEvent.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          action: true,
          title: true,
          amount: true,
          createdAt: true,
        },
      }),
    ]);
    return response({ accounts, transactions, templates, audit });
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
        await tx.account.create({
          data: {
            ...data,
            workspaceId: id,
            history: { create: { status: "Прогрев" } },
          },
        });
      });
    } else if (body.action === "status") {
      const { id: accountId, status } = statusInput.parse(body.data);
      const found = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        const account = await tx.account.findFirst({
          where: { id: accountId, workspaceId: id },
        });
        if (!account) return false;
        if (account.status === status) return true;
        await tx.account.update({
          where: { id: accountId },
          data: {
            status,
            history: { create: { previousStatus: account.status, status } },
          },
        });
        return true;
      });
      if (!found) return response({ error: "Аккаунт не найден" }, 404);
    } else if (body.action === "transaction-edit") {
      if (typeof body.data?.id !== "string" || body.data.id.length > 100)
        return response({ error: "Некорректная операция" }, 400);
      const { id: operationId, ...values } = body.data;
      const data = transactionInput.parse(values);
      const found = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        const row = await tx.transaction.findFirst({
          where: { id: operationId, workspaceId: id },
        });
        if (!row) return false;
        await tx.transaction.update({ where: { id: operationId }, data });
        await tx.auditEvent.create({
          data: {
            workspaceId: id,
            action: "Изменена операция",
            title: data.title,
            amount: data.amount,
          },
        });
        return true;
      });
      if (!found) return response({ error: "Операция не найдена" }, 404);
    } else if (body.action === "transaction-delete") {
      if (typeof body.data?.id !== "string" || body.data.id.length > 100)
        return response({ error: "Некорректная операция" }, 400);
      const found = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        const row = await tx.transaction.findFirst({
          where: { id: body.data.id, workspaceId: id },
        });
        if (!row) return false;
        await tx.transaction.delete({ where: { id: row.id } });
        await tx.auditEvent.create({
          data: {
            workspaceId: id,
            action: "Удалена операция",
            title: row.title,
            amount: row.amount,
          },
        });
        return true;
      });
      if (!found) return response({ error: "Операция не найдена" }, 404);
    } else if (body.action === "template") {
      const data = transactionInput.parse(body.data);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        if (
          (await tx.financeTemplate.count({ where: { workspaceId: id } })) >= 50
        )
          throw new Error("LIMIT");
        await tx.financeTemplate.create({ data: { ...data, workspaceId: id } });
        await tx.auditEvent.create({
          data: {
            workspaceId: id,
            action: "Создан шаблон",
            title: data.title,
            amount: data.amount,
          },
        });
      });
    } else if (body.action === "template-apply") {
      if (typeof body.data?.id !== "string" || body.data.id.length > 100)
        return response({ error: "Некорректный шаблон" }, 400);
      const found = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        const template = await tx.financeTemplate.findFirst({
          where: { id: body.data.id, workspaceId: id },
        });
        if (!template) return false;
        if ((await tx.transaction.count({ where: { workspaceId: id } })) >= 200)
          throw new Error("LIMIT");
        const { title, kind, department, amount } = template;
        await tx.auditEvent.create({
          data: { workspaceId: id, action: "Применён шаблон", title, amount },
        });
        await tx.transaction.create({
          data: { workspaceId: id, title, kind, department, amount },
        });
        return true;
      });
      if (!found) return response({ error: "Шаблон не найден" }, 404);
    } else if (body.action === "transaction") {
      const data = transactionInput.parse(body.data);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${id} FOR UPDATE`;
        if ((await tx.transaction.count({ where: { workspaceId: id } })) >= 200)
          throw new Error("LIMIT");
        await tx.transaction.create({ data: { ...data, workspaceId: id } });
        await tx.auditEvent.create({
          data: {
            workspaceId: id,
            action: "Создана операция",
            title: data.title,
            amount: data.amount,
          },
        });
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
