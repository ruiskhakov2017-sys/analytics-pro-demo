import { test, expect } from "@playwright/test";
test("analytics views and three concepts use the same workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Nord / Search", { exact: true })).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "Фарм-отдел", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Распределение аккаунтов" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Эффективность", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Результаты команды" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "История аккаунтов", exact: true })
    .click();
  await expect(
    page.getByText("Изменения ещё не зарегистрированы.", { exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark", "editorial"]) {
    await page.getByLabel("Концепция").selectOption(theme);
    await expect(page.locator(".application")).toHaveAttribute(
      "data-theme",
      theme,
    );
    await expect(
      page.getByText("Nord / Search", { exact: true }),
    ).toBeVisible();
  }
  await page
    .locator("nav")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await expect(page.getByText("Не подключено", { exact: true })).toHaveCount(4);
  await page.locator("nav").getByRole("button",{name:"Медиабаинг",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Контроль медиабаинга",exact:true})).toBeVisible();
  await expect(page.getByText("Требуют внимания",{exact:true})).toBeVisible();
});
