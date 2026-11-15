import { test, expect } from "@playwright/test";
test("saving template does not post money until explicitly applied", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Nord / Search", { exact: true })).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "Финансы", exact: true })
    .click();
  await page.getByRole("button", { name: "Фарминг", exact: true }).click();
  await page.getByRole("button", { name: "Операция", exact: true }).click();
  await page.getByLabel("Описание", { exact: true }).fill("Ежемесячные прокси");
  await page.getByLabel("Сумма, USD", { exact: true }).fill("50");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Применить Ежемесячные прокси",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".metrics article").nth(1)).toContainText("0,00");
  await page
    .getByRole("button", { name: "Применить Ежемесячные прокси", exact: true })
    .click();
  await expect(page.locator(".metrics article").nth(1)).toContainText("50,00");
  await expect(
    page.getByRole("cell", { name: "Ежемесячные прокси", exact: true }),
  ).toBeVisible();
});
