import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
const COOKIE = "ap_demo";
export async function workspace(create = false) {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id && /^[a-f0-9]{64}$/.test(id)) {
    const existing = await db.workspace.findUnique({ where: { id } });
    if (existing && existing.expiresAt > new Date()) return existing.id;
  }
  if (!create) throw new Error("SESSION_REQUIRED");
  const newId = randomBytes(32).toString("hex");
  await db.workspace.create({
    data: {
      id: newId,
      expiresAt: new Date(Date.now() + 86400000),
      accounts: {
        create: [
          {
            name: "Nord / Search",
            geo: "Германия",
            owner: "Марк",
            status: "В работе",
          },
          {
            name: "Atlas / Performance",
            geo: "Польша",
            owner: "Алина",
            status: "Готов",
          },
          {
            name: "Nova / Discovery",
            geo: "Испания",
            owner: "Даша",
            status: "Прогрев",
          },
        ],
      },
      transactions: {
        create: [
          { title: "Доход демокампаний", kind: "income", amount: 2712000 },
          { title: "Рекламный бюджет", kind: "expense", amount: 1640000 },
        ],
      },
    },
  });
  jar.set(COOKIE, newId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  });
  return newId;
}
