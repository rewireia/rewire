import { expect, type Page } from '@playwright/test';

/**
 * Goes through the plan's three questions with their default answers (a budget of 100, starting
 * out, two hours a week) and asks Rex for three courses, then waits for them.
 */
export async function findThreeCourses(page: Page, es = false): Promise<void> {
  const next = es ? /^Continuar/ : /^Continue/;
  await expect(
    page.getByText(es ? '¿Cuánto quieres invertir?' : 'How much would you like to invest?'),
  ).toBeVisible();
  await page.getByRole('button', { name: next }).click();
  await page.getByRole('button', { name: next }).click();
  await page
    .getByRole('button', {
      name: es ? /^Pedir a Rex que busque 3 cursos/ : /^Ask Rex to find 3 courses/,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: es ? 'Tres meses. Tus próximos pasos.' : 'Three months. Your next steps.',
    }),
  ).toBeVisible();
}

/** Chooses the first course found and goes to the checkout of the selection. */
export async function checkoutFirstCourse(page: Page, es = false): Promise<void> {
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: es ? /^Pasar por caja/ : /^Go to checkout/ }).click();
  await expect(
    page.getByRole('heading', { name: es ? 'Finalizar compra' : 'Checkout', exact: true }),
  ).toBeVisible();
}
