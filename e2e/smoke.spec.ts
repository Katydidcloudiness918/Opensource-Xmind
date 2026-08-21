import { expect, test } from "@playwright/test";

test("core loop: create map, add child, persist, return home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Local Mind Map/i })).toBeVisible();
  await expect(page.getByTestId("empty-maps")).toBeVisible();

  await page.getByTestId("new-map").click();
  await expect(page.getByTestId("map-title")).toHaveValue("Untitled map");
  await expect(page.getByTestId("topic")).toHaveCount(1);

  await page.getByTestId("map-title").fill("Garden plan");
  await page.getByTestId("add-child").click();
  await expect(page.getByTestId("topic")).toHaveCount(2);

  await expect(page.getByTestId("save-status")).toHaveText(/Saved on this device|Saving/);
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device", {
    timeout: 5000,
  });

  await page.getByRole("button", { name: "All maps" }).click();
  await expect(page.getByText("Garden plan")).toBeVisible();
  await expect(page.getByText(/2 topics/)).toBeVisible();
});
