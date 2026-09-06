const { test, expect } = require('@playwright/test');

const authConfig = {
  url: 'https://example.supabase.co',
  anonKey: 'public-anon-test-key'
};

const customer = {
  id: 'customer-1',
  email: 'aarav@example.com',
  user_metadata: { full_name: 'Aarav Singh', mobile: '9876543210' }
};

const session = {
  access_token: 'customer-access-token',
  refresh_token: 'customer-refresh-token',
  token_type: 'bearer',
  user: customer
};

async function preparePage(page){
  await page.addInitScript(config => {
    window.INDUS_CASA_SUPABASE = config;
  }, authConfig);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

async function openAccount(page){
  await page.click('#accountToggle');
  await expect(page.locator('#accountModal')).toHaveClass(/open/);
}

async function fillLogin(page){
  await page.fill('#accountEmail', customer.email);
  await page.fill('#accountPassword', 'correct-password');
  await page.click('#accountSubmit');
}

function mockLogin(page){
  return Promise.all([
    page.route('https://example.supabase.co/auth/v1/token?grant_type=password', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    }),
    page.route('https://example.supabase.co/auth/v1/user', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customer) });
    }),
    page.route('https://example.supabase.co/rest/v1/orders**', async route => {
      expect(new URL(route.request().url()).searchParams.get('customer_id')).toBe(`eq.${customer.id}`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    })
  ]);
}

test.describe('customer account flow', () => {
  test('signs up with Supabase Auth and stores profile metadata', async ({ page }) => {
    await page.route('https://example.supabase.co/auth/v1/signup', async route => {
      expect(route.request().postDataJSON()).toMatchObject({
        email: customer.email,
        data: customer.user_metadata
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...session }) });
    });
    await page.route('https://example.supabase.co/rest/v1/orders**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await preparePage(page);
    await openAccount(page);
    await page.click('#accountModeToggle');
    await page.fill('#accountEmail', customer.email);
    await page.fill('#accountFullName', customer.user_metadata.full_name);
    await page.fill('#accountMobile', customer.user_metadata.mobile);
    await page.fill('#accountPassword', 'correct-password');
    await page.fill('#accountConfirmPassword', 'correct-password');
    await page.click('#accountSubmit');
    await expect(page.locator('#accountDashboardView')).toHaveClass(/active/);
    await expect(page.locator('#accountProfileName')).toHaveText('Aarav Singh');
    await expect(page.locator('#accountProfileMobile')).toHaveText('9876543210');
  });

  test('logs in, persists the session, and logs out', async ({ page }) => {
    await preparePage(page);
    await mockLogin(page);
    await openAccount(page);
    await fillLogin(page);
    await expect(page.locator('#accountProfileEmail')).toHaveText(customer.email);
    await expect(page.locator('#accountOrders')).toContainText('No orders are linked');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#accountToggle')).toBeVisible();
    await openAccount(page);
    await expect(page.locator('#accountProfileName')).toHaveText('Aarav Singh');
    await page.route('https://example.supabase.co/auth/v1/logout', route => route.fulfill({ status: 204, body: '' }));
    await page.click('#accountLogout');
    await expect(page.locator('#accountAuthView')).toHaveClass(/active/);
    expect(await page.evaluate(() => localStorage.getItem('indus-casa-auth-session'))).toBeNull();
  });

  test('handles forgot-password requests without exposing account existence', async ({ page }) => {
    await page.route('https://example.supabase.co/auth/v1/recover', async route => {
      expect(route.request().postDataJSON()).toMatchObject({ email: customer.email });
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await preparePage(page);
    await openAccount(page);
    await page.fill('#accountEmail', customer.email);
    await page.click('#accountForgot');
    await expect(page.locator('#accountStatus')).toContainText('If an account exists');
  });

  test('handles a recovery link and updates the password through Supabase Auth', async ({ page }) => {
    await page.addInitScript(config => {
      window.INDUS_CASA_SUPABASE = config;
    }, authConfig);
    await page.route('https://example.supabase.co/auth/v1/user', async route => {
      expect(route.request().method()).toBe('GET');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customer) });
    });
    await page.route('https://example.supabase.co/rest/v1/orders**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/#type=recovery&access_token=recovery-access-token&refresh_token=recovery-refresh-token');
    await expect(page.locator('#accountRecoveryView')).toHaveClass(/active/);
    await page.fill('#accountNewPassword', 'new-password');
    await page.fill('#accountNewPasswordConfirm', 'new-password');
    await page.unroute('https://example.supabase.co/auth/v1/user');
    await page.route('https://example.supabase.co/auth/v1/user', async route => {
      expect(route.request().method()).toBe('PUT');
      expect(route.request().postDataJSON()).toEqual({ password: 'new-password' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customer) });
    });
    await page.click('#accountRecoveryForm button[type="submit"]');
    await expect(page.locator('#accountDashboardView')).toHaveClass(/active/);
  });

  test('loads only the logged-in customer order and renders delivery details', async ({ page }) => {
    await page.route('https://example.supabase.co/auth/v1/token?grant_type=password', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    });
    await page.route('https://example.supabase.co/rest/v1/orders**', async route => {
      const requestUrl = new URL(route.request().url());
      expect(requestUrl.searchParams.get('customer_id')).toBe('eq.customer-1');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        order_reference: 'IC-123456',
        order_date_time: '2026-09-06T10:00:00.000Z',
        ordered_products: [{ product_name: 'Navy Signature', variant_size: 'M', quantity: 1, unit_price: 1999 }],
        order_total: 1999,
        payment_method: 'Cash on Delivery',
        payment_status: 'COD',
        order_status: 'New',
        delivery_address: '42 Garden Lane',
        delivery_city: 'Jaipur',
        delivery_state: 'Rajasthan',
        delivery_pin: '302001'
      }]) });
    });
    await preparePage(page);
    await openAccount(page);
    await fillLogin(page);
    await expect(page.locator('#accountOrders')).toContainText('IC-123456');
    await expect(page.locator('#accountOrders')).toContainText('Navy Signature');
    await expect(page.locator('#accountOrders')).toContainText('42 Garden Lane');
    await expect(page.locator('#accountOrders')).not.toContainText('another-customer-order');
  });

  test('associates a logged-in checkout order with the authenticated customer', async ({ page }) => {
    let storedOrder;
    await page.route('https://example.supabase.co/auth/v1/token?grant_type=password', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    });
    await page.route('https://example.supabase.co/rest/v1/orders', async route => {
      storedOrder = route.request().postDataJSON();
      await route.fulfill({ status: 201, body: '' });
    });
    await page.route('https://formsubmit.co/ajax/induscasafashion@gmail.com', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await preparePage(page);
    await openAccount(page);
    await fillLogin(page);
    await page.click('#accountClose');
    await page.goto('/#product/navy-signature');
    await page.selectOption('#detail-size', 'M');
    await page.click('#add-to-cart');
    await page.click('#cartCheckout');
    await page.fill('#checkoutFullName', 'Aarav Singh');
    await page.fill('#checkoutMobile', '9876543210');
    await page.fill('#checkoutEmail', customer.email);
    await page.fill('#checkoutAddress', '42 Garden Lane, Sector 18');
    await page.fill('#checkoutCity', 'Jaipur');
    await page.fill('#checkoutState', 'Rajasthan');
    await page.fill('#checkoutPin', '302001');
    await page.getByLabel('Cash on Delivery').check();
    await page.click('#placeOrderButton');
    await expect(page.locator('#checkoutConfirmation')).toHaveClass(/visible/);
    await expect.poll(() => storedOrder).toMatchObject({ customer_id: customer.id });
  });

  test('account login has no unexpected page errors or failed requests', async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('console', message => { if(message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push(request.url()));
    await preparePage(page);
    await mockLogin(page);
    await openAccount(page);
    await fillLogin(page);
    await expect(page.locator('#accountDashboardView')).toHaveClass(/active/);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
