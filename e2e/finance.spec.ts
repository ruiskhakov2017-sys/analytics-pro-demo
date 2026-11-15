import { test, expect } from "@playwright/test";

test("finance operations persist in their department and update totals", async ({page}) => {
  await page.goto("/");
  await expect(page.getByText("Nord / Search", {exact:true})).toBeVisible();
  await page.locator("nav").getByRole("button", {name:"Финансы",exact:true}).click();
  await page.getByRole("button", {name:"Фарминг",exact:true}).click();
  await page.getByRole("button", {name:"Операция",exact:true}).click();
  await page.getByLabel("Описание",{exact:true}).fill("Проверка расходов фарма");
  await page.getByLabel("Сумма, USD",{exact:true}).fill("12.34");
  await page.getByRole("button",{name:"Сохранить",exact:true}).click();
  await expect(page.getByText("Проверка расходов фарма",{exact:true})).toBeVisible();
  await expect(page.locator(".metrics article").nth(1)).toContainText("12,34");
  await page.getByRole("button",{name:"Общее",exact:true}).click();
  await expect(page.getByText("Проверка расходов фарма",{exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Nord / Search",{exact:true})).toBeVisible();
  await page.locator("nav").getByRole("button",{name:"Финансы",exact:true}).click();
  await page.getByRole("button",{name:"Фарминг",exact:true}).click();
  await expect(page.getByText("Проверка расходов фарма",{exact:true})).toBeVisible();
});
