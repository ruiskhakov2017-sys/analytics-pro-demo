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
  await page.getByLabel("Дневной лимит, USD", {exact:true}).fill("123.45");
  await page.getByLabel("Качество", {exact:true}).selectOption("Высокое");
  await page.getByLabel("Провайдер прокси", {exact:true}).fill("Proxy Demo");
  await page.getByLabel("BIN карты", {exact:true}).fill("412345");
  await page.getByLabel("Схема прогрева", {exact:true}).fill("Scheme A");
  await page.getByLabel("Дофарм включён", {exact:true}).check();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Isolated account", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Isolated account", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Статус Isolated account", exact: true })
    .selectOption("Готов");
  await expect(
    page.getByRole("combobox", {
      name: "Статус Isolated account",
      exact: true,
    }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Isolated account", exact: true })
    .click();
  await expect(
    page.getByText("Прогрев → Готов", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Создан: Прогрев", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", {name:"Isolated account",exact:true}).click();
  await expect(page.getByText("Качество: Высокое", {exact:true})).toBeVisible();
  await expect(page.getByText("Прокси: Proxy Demo", {exact:true})).toBeVisible();
  await expect(page.getByText("BIN: 412345", {exact:true})).toBeVisible();
  await expect(page.getByText("Схема прогрева: Scheme A", {exact:true})).toBeVisible();
  await expect(page.getByText("Дофарм: Да", {exact:true})).toBeVisible();
  await expect(page.getByText(/Дневной лимит:.*123,45/)).toBeVisible();
  await page.getByLabel("Новый дневной лимит, USD", {exact:true}).fill("250");
  await page.getByLabel("Новый дневной лимит, USD", {exact:true}).press("Tab");
  await expect(page.getByText("История дневного лимита")).toBeVisible();
  await expect(
    page.getByText(/^250,00\s+\$$/),
  ).toBeVisible();
  await page.getByRole("button", {name:"Закрыть",exact:true}).click();
  await page.reload();
  await page.getByRole("button", {name:"Isolated account",exact:true}).click();
  await expect(page.getByText("История дневного лимита")).toBeVisible();
  await expect(
    page.getByText(/^250,00\s+\$$/),
  ).toBeVisible();
  await page.getByRole("button", {name:"Закрыть",exact:true}).click();
  await page.locator("nav").getByRole("button", {name:"Фарм-отдел",exact:true}).click();
  await page.getByRole("button", {name:"Лимиты",exact:true}).click();
  await expect(page.getByRole("heading", {name:"Скорость роста лимита",exact:true})).toBeVisible();
  await page
    .getByRole("combobox", { name: "Статус Isolated account", exact: true })
    .selectOption("Бан");
  await page.locator("nav").getByRole("button", { name: "Журнал операций", exact: true }).click();
  await expect(
    page.locator("section.panel h2").getByText("Журнал операций", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Создан аккаунт", { exact: true })).toBeVisible();
  await expect(page.getByText("Изменён лимит", { exact: true })).toBeVisible();
  await expect(page.getByText("Изменён статус", { exact: true })).toBeVisible();
  await page.getByLabel("Тип события журнала", { exact: true }).selectOption("account");
  await expect(page.getByText("Изменена операция", { exact: true })).toHaveCount(0);
  await page.locator("nav").getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Новое имя для Демо", { exact: true }).fill("Демо фермер");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Переименован фармер", { exact: true })).toBeVisible();
  await expect(page.getByText("Демо фермер", { exact: true })).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "Медиабаинг", exact: true })
    .click();
  await expect(page.getByText("Связки с зафиксированными банами")).toBeVisible();
  await expect(page.getByText("Proxy Demo", { exact: true })).toBeVisible();
  await expect(page.getByText("412345", { exact: true })).toBeVisible();
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
