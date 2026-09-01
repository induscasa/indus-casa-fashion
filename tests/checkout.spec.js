const { test, expect } = require('@playwright/test');

const products = {
  'navy-signature': { name: 'Navy Signature', market: '₹2,499', selling: '₹1,999', discount: '20% off' },
  'white-essential': { name: 'White Essential', market: '₹3,499', selling: '₹2,499', discount: '29% off' },
  'soft-beige': { name: 'Soft Beige', market: '₹2,499', selling: '₹1,999', discount: '20% off' },
  'soft-lilac': { name: 'Soft Lilac', market: '₹2,499', selling: '₹1,999', discount: '20% off' },
  'ivory-cream': { name: 'Ivory Cream', market: '₹2,499', selling: '₹1,999', discount: '20% off' },
  'white-box': { name: 'The White Box', market: '₹2,499', selling: '₹1,999', discount: '20% off' }
};

test.describe('Indus Casa checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000/#product/navy-signature');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('cart to checkout navigation and product details are preserved', async ({ page }) => {
    await page.selectOption('#detail-size', 'M');
    await page.click('#add-to-cart');

    await expect(page.locator('#cartOverlay')).toHaveClass(/open/);
    await expect(page.locator('#cartCount')).toHaveText('1');
    await expect(page.locator('#cartItems .cart-item')).toContainText('Navy Signature');
    await expect(page.locator('#cartItems .cart-item')).toContainText('Size: M');

    await page.click('#cartCheckout');
    await expect(page.locator('#checkoutModal')).toHaveClass(/open/);
    await expect(page.locator('#checkoutForm')).toBeVisible();
    await expect(page.locator('#checkoutItems')).toContainText('Navy Signature');
    await expect(page.locator('#checkoutItems')).toContainText('Size: M');
    await expect(page.locator('#checkoutItems')).toContainText('Qty: 1');
    await expect(page.locator('#checkoutGrandTotal')).toHaveText('₹1,999');
    await expect(page.locator('#checkoutMarketTotal')).toHaveText('₹2,499');
    await expect(page.locator('#checkoutDiscountTotal')).toHaveText('- ₹500');
  });

  test('all six products show exact prices on cards and detail pages', async ({ page }) => {
    await page.goto('http://localhost:8000/#pieces');
    for (const [slug, product] of Object.entries(products)) {
      const card = page.locator(`.product[data-product="${slug}"]`);
      await expect(card.locator('.market-price')).toHaveText(product.market);
      await expect(card.locator('.product-price-main strong')).toHaveText(product.selling);
      await expect(card.locator('.discount-badge')).toHaveText(product.discount);

      await page.goto(`http://localhost:8000/#product/${slug}`);
      await expect(page.locator('#detail-pricing .detail-market-price')).toHaveText(product.market);
      await expect(page.locator('#detail-pricing .detail-selling-price')).toHaveText(product.selling);
      await expect(page.locator('#detail-pricing .detail-discount-badge')).toHaveText(product.discount);
      await expect(page.locator('#detail-pricing')).toHaveCount(1);
      await expect(page.locator('body')).not.toContainText('On enquiry');
    }
  });

  test('every product accepts each size and adds to cart', async ({ page }) => {
    for (const [slug, product] of Object.entries(products)) {
      for (const size of ['S', 'M', 'L', 'XL']) {
        await page.goto(`http://localhost:8000/#product/${slug}`);
        await page.selectOption('#detail-size', size);
        await expect(page.locator('#add-to-cart')).toBeEnabled();
        await page.click('#add-to-cart');
        const cartItem = page.locator(`[data-cart-key="${slug}|${size}"]`);
        await expect(cartItem).toContainText(product.name);
        await expect(cartItem).toContainText(`Size: ${size}`);
        await expect(cartItem.locator('.cart-market-price')).toHaveText(product.market);
        await expect(cartItem.locator('.cart-selling-price')).toHaveText(product.selling);
        await expect(cartItem.locator('.cart-discount')).toHaveText(product.discount);
        await page.click('#cartClose');
      }
    }
  });

  test('cart item totals and final total use selling prices', async ({ page }) => {
    await page.goto('http://localhost:8000/#product/white-essential');
    await page.selectOption('#detail-size', 'L');
    await page.click('#add-to-cart');
    await page.click('[data-action="increase"]');
    await expect(page.locator('#cartItems .cart-item')).toContainText('₹2,499');
    await expect(page.locator('#cartTotal')).toHaveText('₹4,998');
    await page.click('#cartCheckout');
    await expect(page.locator('#checkoutGrandTotal')).toHaveText('₹4,998');
    await expect(page.locator('#checkoutMarketTotal')).toHaveText('₹6,998');
    await expect(page.locator('#checkoutDiscountTotal')).toHaveText('- ₹2,000');
  });

  test('multiple products recalculate cart and checkout totals', async ({ page }) => {
    await page.goto('http://localhost:8000/#product/navy-signature');
    await page.selectOption('#detail-size', 'S');
    await page.click('#add-to-cart');
    await page.click('#cartClose');

    await page.goto('http://localhost:8000/#product/white-essential');
    await page.selectOption('#detail-size', 'XL');
    await page.click('#add-to-cart');
    await expect(page.locator('#cartItems .cart-item')).toHaveCount(2);
    await expect(page.locator('#cartTotal')).toHaveText('₹4,498');

    await page.locator('[data-cart-key="navy-signature|S"] [data-action="increase"]').click();
    await expect(page.locator('#cartTotal')).toHaveText('₹6,497');
    await expect(page.locator('[data-cart-key="navy-signature|S"] .cart-quantity span')).toHaveText('2');

    await page.click('#cartCheckout');
    await expect(page.locator('#checkoutItems .checkout-item')).toHaveCount(2);
    await expect(page.locator('#checkoutItems')).toContainText('Navy Signature');
    await expect(page.locator('#checkoutItems')).toContainText('Size: S · Qty: 2');
    await expect(page.locator('#checkoutItems')).toContainText('White Essential');
    await expect(page.locator('#checkoutItems')).toContainText('Size: XL · Qty: 1');
    await expect(page.locator('#checkoutMarketTotal')).toHaveText('₹8,497');
    await expect(page.locator('#checkoutDiscountTotal')).toHaveText('- ₹2,000');
    await expect(page.locator('#checkoutGrandTotal')).toHaveText('₹6,497');
  });

  test('required field validation prevents incomplete checkout', async ({ page }) => {
    await page.selectOption('#detail-size', 'M');
    await page.click('#add-to-cart');
    await page.click('#cartCheckout');

    await page.click('#placeOrderButton');
    await expect(page.locator('#error-fullName')).toContainText('Please enter your full name.');
    await expect(page.locator('#error-mobile')).toContainText('Please enter a valid mobile number.');
    await expect(page.locator('#error-email')).toContainText('Please enter a valid email address.');
    await expect(page.locator('#error-address')).toContainText('Please enter your delivery address.');
    await expect(page.locator('#error-city')).toContainText('Please enter your city.');
    await expect(page.locator('#error-state')).toContainText('Please enter your state.');
    await expect(page.locator('#error-pin')).toContainText('PIN code must be exactly 6 digits.');
    await expect(page.locator('#error-payment')).toContainText('Please select a payment method.');
  });

  test('payment method selection and enquiry confirmation work', async ({ page }) => {
    await page.selectOption('#detail-size', 'M');
    await page.click('#add-to-cart');
    await page.click('#cartCheckout');

    await page.fill('#checkoutFullName', 'Aarav Singh');
    await page.fill('#checkoutMobile', '9876543210');
    await page.fill('#checkoutEmail', 'aarav@example.com');
    await page.fill('#checkoutAddress', '42 Garden Lane, Sector 18');
    await page.fill('#checkoutCity', 'Jaipur');
    await page.fill('#checkoutState', 'Rajasthan');
    await page.fill('#checkoutPin', '302001');
    await page.getByLabel('UPI').check();

    await page.click('#placeOrderButton');
    await expect(page.locator('#checkoutConfirmation')).toHaveClass(/visible/);
    await expect(page.locator('#confirmationReference')).toContainText('IC-');
    await expect(page.locator('#confirmationPayment')).toHaveText('UPI');
    await expect(page.locator('#confirmationTotal')).toHaveText('₹1,999');
    await expect(page.locator('#confirmationItems')).toContainText('Navy Signature');
    await expect(page.locator('#confirmationItems')).toContainText('Size M');
    await expect(page.locator('#confirmationItems')).toContainText('Qty 1');
    await expect(page.locator('#checkoutConfirmation')).toContainText('No real payment has been processed');

    await page.click('#confirmationClose');
    await expect(page.locator('#checkoutModal')).not.toHaveClass(/open/);
  });
});
