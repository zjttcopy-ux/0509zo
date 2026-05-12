const { chromium } = require('playwright');

const EMAIL = 'ttt0090@gmail.com';

async function safeScreenshot(page, path) {
  try {
    await page.screenshot({
      path,
      fullPage: true,
    });
    console.log(`📸 已保存截图：${path}`);
  } catch {
    console.log(`⚠️ 截图失败：${path}`);
  }
}

async function clickSafely(locator, name) {
  try {
    console.log(`👉 尝试点击：${name}`);
    await locator.click({
      timeout: 10000,
    });
    return true;
  } catch {
    console.log(`⚠️ 普通点击失败：${name}`);
  }

  try {
    console.log(`👉 尝试强制点击：${name}`);
    await locator.click({
      timeout: 10000,
      force: true,
    });
    return true;
  } catch {
    console.log(`⚠️ 强制点击失败：${name}`);
  }

  return false;
}

async function run() {
  console.log(`🚀 开始执行：${new Date().toLocaleString()}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 900,
    },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('🌐 访问注册页面...');
    await page.goto('https://www.zo.computer/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(5000);
    await safeScreenshot(page, 'send-open.png');

    console.log("📧 点击 'Email me a link'...");

    const emailMeButton = page
      .getByText('Email me a link', { exact: false })
      .or(page.getByText('email me a link', { exact: false }))
      .or(page.locator('button:has-text("Email")'))
      .or(page.locator('text=Email me'))
      .first();

    await clickSafely(emailMeButton, 'Email me a link');

    await page.waitForTimeout(3000);
    await safeScreenshot(page, 'send-after-click-email-link.png');

    console.log('⌛ 等待邮箱输入框...');

    const emailInput = page
      .locator('input[type="email"]')
      .or(page.locator('input[name*="email"]'))
      .or(page.locator('input[placeholder*="email"]'))
      .or(page.locator('input[placeholder*="Email"]'))
      .first();

    await emailInput.waitFor({
      state: 'visible',
      timeout: 30000,
    });

    console.log('✉️ 输入邮箱...');
    await emailInput.fill(EMAIL);

    await page.waitForTimeout(1000);

    console.log('📤 提交请求...');

    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.getByText('Submit', { exact: false }))
      .or(page.getByText('Continue', { exact: false }))
      .or(page.getByText('Send', { exact: false }))
      .or(page.getByText('Email me', { exact: false }))
      .first();

    const clicked = await clickSafely(submitButton, 'Submit / Send');

    if (!clicked) {
      console.log('⚠️ 没找到提交按钮，尝试按 Enter');
      await emailInput.press('Enter');
    }

    await page.waitForTimeout(8000);
    await safeScreenshot(page, 'send-result.png');

    console.log('✅ 邮件发送成功');
  } catch (err) {
    console.error('❌ 发送邮件失败:', err);
    await safeScreenshot(page, 'send-error.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('🔚 浏览器关闭');
  }
}

run();
