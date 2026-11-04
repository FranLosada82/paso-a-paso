import { expect, test, type Page } from '@playwright/test';

async function entrarAdulto(page: Page) {
  await expect(page.getByText('¿Cuál es la raíz cúbica de 27?')).toBeVisible();
  await page.getByRole('textbox').fill('3');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Rellena una respuesta cualquiera (no siempre bien) en la actividad que esté en pantalla. */
async function rellenar(page: Page) {
  const radios = page.locator('[role=radio]:not([disabled])');
  if (await radios.count()) await radios.first().click();
  else if (await page.getByLabel('Escribe tu respuesta').count()) await page.getByLabel('Escribe tu respuesta').fill('7');
  else if (await page.getByText('Toca en orden').count()) {
    const fichas = page.locator('.fichas .ficha:not([disabled])');
    while (await fichas.count()) await fichas.first().click();
  } else {
    const libre = ':not(.c1):not(.c2):not(.c3):not(.c4)';
    const izq = page.locator(`.relacionar .columna:nth-child(1) .ficha${libre}`);
    const der = page.locator(`.relacionar .columna:nth-child(2) .ficha${libre}`);
    while (await izq.count()) { await izq.first().click(); await der.first().click(); }
  }
}

/** Avanza un paso de la sesión: tarjeta «Descubre» o actividad (con su posible segundo intento). */
async function responderUna(page: Page) {
  const tarjeta = page.getByRole('button', { name: /¡Vamos a practicar!|¡Ahora lo pruebo!/ });
  await expect(tarjeta.or(page.getByRole('button', { name: /^Comprobar/ }))).toBeVisible();
  if (await tarjeta.count()) { await tarjeta.click(); return; }
  await rellenar(page);
  await page.getByRole('button', { name: 'Comprobar' }).click();
  const otraVez = page.getByRole('button', { name: 'Comprobar otra vez' });
  await expect(otraVez.or(page.getByRole('button', { name: 'Continuar' }))).toBeVisible();
  if (await otraVez.count()) { await rellenar(page); await otraVez.click(); }
  await expect(page.locator('.pie.ok, .pie.ko')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('primera carga, marcar temas, practicar, offline, reapertura', async ({ page, context, browserName }) => {
  // Playwright no intercepta peticiones con service worker en WebKit: allí se prueba todo salvo el modo sin red.
  const sinRed = browserName !== 'webkit';
  test.info().annotations.push({ type: 'offline', description: sinRed ? 'probado sin red' : 'WebKit: sin red no probable en Playwright' });
  // 1. Primera carga online: el service worker precarga todo.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CHENCHO REPASO' })).toBeVisible();
  if (sinRed) {
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  }

  // 2. Adulto marca temas de Matemáticas hasta el tema 2.
  await page.getByRole('button', { name: /Matemáticas/ }).click();
  await page.getByRole('button', { name: 'Marcar página (adulto)' }).click();
  await entrarAdulto(page);
  await page.getByLabel('¿Por qué página del libro vais en clase?').fill('40');
  await expect(page.getByText(/vais por el tema 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByText('Vais por la página 40')).toBeVisible();
  await expect(page.getByRole('button', { name: /Tema 2:.*A medias/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Tema 3:.*Aún no dado/ })).toBeDisabled();

  // 3. «Aprender»: presenta el concepto, ofrece pistas y «Explícamelo de otra manera», y termina con un reto.
  await page.getByRole('button', { name: /Aprender/ }).click();
  await expect(page.getByText('Descubre')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Decenas y unidades' })).toBeVisible();
  await page.getByRole('button', { name: '¡Vamos a practicar!' }).click();
  await page.getByRole('button', { name: /Explícamelo de otra manera/ }).click();
  await expect(page.locator('.otra-manera')).toBeVisible();
  await page.getByRole('button', { name: /Pista/ }).click();
  await expect(page.locator('.pistas li').first()).toBeVisible();
  for (let i = 0; i < 40 && !(await page.getByText('¡Misión cumplida!').count()); i++) await responderUna(page);
  await expect(page.getByText('¡Misión cumplida!')).toBeVisible();
  await page.getByRole('button', { name: 'Volver a temas' }).click();

  // 4. «Repasar»: sesión completa (incluye refuerzo de las falladas), sin pistas al principio.
  await page.getByRole('button', { name: /Repasar todo lo dado/ }).click();
  await expect(page.getByRole('button', { name: /Pista/ })).toHaveCount(0);
  for (let i = 0; i < 40 && !(await page.getByText('¡Repaso terminado!').count()); i++) {
    await expect(page.locator('.tema-chip')).toContainText(/Tema [12]/);
    await responderUna(page);
  }
  await expect(page.getByText('¡Repaso terminado!')).toBeVisible();

  // 5. Sin conexión: recarga y navegación por las 7 asignaturas.
  if (sinRed) await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CHENCHO REPASO' })).toBeVisible();
  await expect(page.getByText('Vais por la pág. 40')).toBeVisible();
  const nombres = ['Matemáticas', 'Lengua', 'Naturaleza', 'Sociales', 'Natural Science', 'Inglés', 'Música'];
  for (const n of nombres) {
    await page.locator('.asig', { hasText: n }).click();
    await expect(page.locator('.camino li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
  }
  // Practicar offline otra asignatura.
  await page.getByRole('button', { name: /Natural Science/ }).click();
  await page.getByRole('button', { name: 'Marcar página (adulto)' }).click();
  await entrarAdulto(page);
  await page.getByRole('button', { name: 'Terminado' }).first().click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await page.getByRole('button', { name: /Repasar todo lo dado/ }).click();
  await responderUna(page);
  await page.reload();
  await expect(page.locator('.enunciado')).toBeVisible();

  // 6. Cerrar y reabrir (offline): el progreso sigue.
  await page.close();
  const otra = await context.newPage();
  await otra.goto('/');
  await expect(otra.getByText('Vais por la pág. 40')).toBeVisible();
  await expect(otra.getByRole('button', { name: /Continuar/ })).toBeVisible();
  await otra.getByRole('button', { name: /Zona de adultos/ }).click();
  await entrarAdulto(otra);
  await expect(otra.getByText(/2 sesiones/).first()).toBeVisible();
  // Vista de progreso del adulto: conceptos trabajados.
  await otra.getByRole('button', { name: 'Progreso' }).first().click();
  await expect(otra.getByText('Decenas y unidades', { exact: true })).toBeVisible();
  await expect(otra.getByText(/ideas dominadas/)).toBeVisible();
});
