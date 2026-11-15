import { test, expect } from "@playwright/test";
test("accounts persist and are isolated between visitors", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page.getByText("Nord / Search", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Аккаунт", exact: true }).click();
  await page.getByLabel("Название", { exact: true }).fill("Isolated account");
  await page.getByLabel("География", { exact: true }).fill("Польша");
  await page.getByLabel("Ответственный", { exact: true }).fill("Демо");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Isolated account", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Isolated account", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", {name:"Статус Isolated account", exact:true}).selectOption("Готов");
  await expect(page.getByRole("combobox", {name:"Статус Isolated account", exact:true})).toBeEnabled();
  await page.getByRole("button", {name:"Isolated account", exact:true}).click();
  await expect(page.getByText("Прогрев → Готов", {exact:true})).toBeVisible();
  await expect(page.getByText("Создан: Прогрев", {exact:true})).toBeVisible();
  await page.getByRole("button", {name:"Закрыть", exact:true}).click();
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await second.goto("/");
    await expect(
      second.getByText("Nord / Search", { exact: true }),
    ).toBeVisible();
    await expect(
      second.getByText("Isolated account", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
});
