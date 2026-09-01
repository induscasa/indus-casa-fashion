module.exports = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    headless: true,
    baseURL: 'http://localhost:8000',
    viewport: { width: 1400, height: 1600 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
};
