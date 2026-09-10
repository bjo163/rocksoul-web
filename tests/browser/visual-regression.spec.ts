import { expect, test } from "@playwright/test"

test.describe("ROCKSOUL web surfaces", () => {
  test("public observatory has a stable visual baseline and working search", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "WHERE MYTH FADES TO LEGEND" })).toBeVisible()
    await page.waitForTimeout(3000)
    await expect(page).toHaveScreenshot("public-observatory.png", { animations: "disabled", maxDiffPixelRatio: 0.02 })

    const search = page.getByRole("textbox", { name: "Search reviewed correlation cases" })
    await search.fill("Jerusalem")
    await page.getByRole("button", { name: "SEARCH EVIDENCE" }).click()
    await expect(page.getByRole("button", { name: /Jerusalem \/ Second Temple destruction/ })).toBeVisible()
    // Search result rendering is asserted semantically; its API-backed case detail is intentionally not snapshotted.
  })

  test("AWS case surface has a stable form and responsive baseline", async ({ page }) => {
    await page.goto("/aws#overview")
    await page.waitForTimeout(1800)
    await page.getByRole("button", { name: "INSPECT A CASE" }).click()
    await expect(page).toHaveURL(/#case$/)
    await expect(page.getByRole("searchbox", { name: "Case ID" })).toBeVisible()
    await expect(page).toHaveScreenshot("aws-case.png", { animations: "disabled", maxDiffPixelRatio: 0.02 })
  })
})
