import { expect, test, type Page } from '@playwright/test';

async function entrarAdulto(page: Page) {
  await expect(page.getByText('¿Cuál es la raíz cúbica de 27?')).toBeVisible();
  await page.getByRole('textbox').fill('3');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Responde cualquier tipo de pregunta (no siempre bien) y avanza. */
async function responderUna(page: Page) {
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeVisible();
  const radios = page.getByRole('radio');
  if (await radios.count()) await radios.first().click();
  else if (await page.getByLabel('Escribe tu respuesta').count()) await page.getByLabel('Escribe tu respuesta').fill('7');
  else if (await page.getByText('Toca en orden').count()) {
    const fichas = page.locator('.fichas .ficha:not([disabled])');
    while (await fichas.count()) await fichas.first().click();
  } else {
    const izq = page.locator('.relacionar .columna').nth(0).locator('.ficha');
    const der = page.locator('.relacionar .columna').nth(1).locator('.ficha');
    for (let i = 0; i < (await izq.count()); i++) { await izq.nth(i).click(); await der.nth(i).click(); }
  }
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.locator('.pie.ok, .pie.ko')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('primera carga, marcar temas, practicar, offline, reapertura', async ({ page, context, browserName }) => {
  // Playwright no intercepta peticiones con service worker en WebKit: allí se prueba todo salvo el modo sin red.
  const sinRed = browserName !== 'webkit';
  test.info().annotations.push({ type: 'offline', description: sinRed ? 'probado sin red' : 'WebKit: sin red no probable en Playwright' });
  // 1. Primera carga online: el service worker precarga todo.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'REPASO' })).toBeVisible();
  if (sinRed) {
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  }

  // 2. Adulto marca temas de Matemáticas hasta el tema 2.
  await page.getByRole('button', { name: /Matemáticas/ }).click();
  await page.getByRole('button', { name: 'Marcar temas (adulto)' }).click();
  await entrarAdulto(page);
  await page.getByRole('button', { name: 'Hasta aquí' }).nth(1).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByRole('button', { name: /Repasar todo lo dado \(2 temas\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tema 3:.*Aún no dado/ })).toBeDisabled();

  // 3. Sesión completa (incluye repetición de las falladas).
  await page.getByRole('button', { name: /Repasar todo lo dado/ }).click();
  for (let i = 0; i < 25 && !(await page.getByText('¡Sesión terminada!').count()); i++) {
    await expect(page.locator('.tema-chip')).toContainText(/Tema [12]:/);
    await responderUna(page);
  }
  await expect(page.getByText('¡Sesión terminada!')).toBeVisible();

  // 4. Sin conexión: recarga y navegación por las 7 asignaturas.
  if (sinRed) await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'REPASO' })).toBeVisible();
  await expect(page.getByText('2 de 9 temas dados')).toBeVisible();
  const nombres = ['Matemáticas', 'Lengua', 'Naturaleza', 'Sociales', 'Natural Science', 'Inglés', 'Música'];
  for (const n of nombres) {
    await page.locator('.asig', { hasText: n }).click();
    await expect(page.locator('.camino li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
  }
  // Practicar offline otra asignatura.
  await page.getByRole('button', { name: /Natural Science/ }).click();
  await page.getByRole('button', { name: 'Marcar temas (adulto)' }).click();
  await entrarAdulto(page);
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.getByRole('button', { name: /Repasar todo lo dado/ }).click();
  await responderUna(page);
  await page.reload();
  await expect(page.locator('.enunciado')).toBeVisible();

  // 5. Cerrar y reabrir (offline): el progreso sigue.
  await page.close();
  const otra = await context.newPage();
  await otra.goto('/');
  await expect(otra.getByText('2 de 9 temas dados')).toBeVisible();
  await expect(otra.getByRole('button', { name: /Continuar/ })).toBeVisible();
  await otra.getByRole('button', { name: /Zona de adultos/ }).click();
  await entrarAdulto(otra);
  await expect(otra.getByText(/1 sesiones/).first()).toBeVisible();
});
