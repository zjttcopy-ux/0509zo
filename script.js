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

async function isVisible(locator, timeout = 3000) {
  try {
    await locator.waitFor({
      state: 'visible',
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

async function clickSafely(locator, name) {
  try {
    console.log(`👉 尝试普通点击：${name}`);
    await locator.click({
      timeout: 8000,
    });
    return true;
  } catch {
    console.log(`⚠️ 普通点击失败：${name}`);
  }

  try {
    console.log(`👉 尝试强制点击：${name}`);
    await locator.click({
      timeout: 8000,
      force: true,
    });
    return true;
  } catch {
    console.log(`⚠️ 强制点击失败：${name}`);
  }

  return false;
}

async function findEmailInput(page) {
  const input = page
    .locator('input[type="email"]')
    .or(page.locator('input[name*="email" i]'))
    .or(page.locator('input[placeholder*="email" i]'))
    .or(page.locator('input[autocomplete*="email" i]'))
    .or(page.locator('input'))
    .first();

  if (await isVisible(input, 5000)) {
    return input;
  }

  return null;
}

async function clickEmailMeLink(page) {
  console.log("📧 准备点击 Email me a link...");

  const candidates = [
    page.getByText('Email me a link', { exact: false }),
    page.getByText('email me a link', { exact: false }),
    page.getByText('Email me', { exact: false }),
    page.getByText('Get a link', { exact: false }),
    page.locator('button:has-text("Email")'),
    page.locator('a:has-text("Email")'),
    page.locator('[role="button"]:has-text("Email")'),
    page.locator('button'),
    page.locator('a')
  ];

  for (const candidate of candidates) {
    const loc = candidate.first();

    if (await isVisible(loc, 5000)) {
      const clicked = await clickSafely(loc, 'Email me a link');
      if (clicked) {
        await page.waitForTimeout(4000);
        return true;
      }
    }
  }

  console.log('⚠️ 常规方式没点到，尝试 JS 查找文字点击...');

  try {
    const jsClicked = await page.evaluate(() => {
      const texts = [
        'Email me a link',
        'email me a link',
        'Email me',
        'email me',
        'Get a link'
      ];

      const all = Array.from(document.querySelectorAll('button, a, div, span'));

      const target = all.find((el) => {
        const text = (el.textContent || '').trim();
        return texts.some((t) => text.includes(t));
      });

      if (!target) {
        return false;
      }

      target.click();
      return true;
    });

    if (jsClicked) {
      console.log('✅ JS 已点击 Email me a link');
      await page.waitForTimeout(4000);
      return true;
    }
  } catch {
    console.log('⚠️ JS 点击失败');
  }

  console.log('⚠️ 尝试坐标点击页面中部按钮位置...');
  try {
    await page.mouse.click(640, 450);
    await page.waitForTimeout(4000);
    return true;
  } catch {
    return false;
  }
}

async function submitEmail(page, emailInput) {
  console.log('✉️ 输入邮箱...');
  await emailInput.fill(EMAIL);

  await page.waitForTimeout(1000);
  await safeScreenshot(page, 'send-before-submit.png');

  console.log('📤 提交请求...');

  const submitButton = page
    .locator('button[type="submit"]')
    .or(page.getByText('Submit', { exact: false }))
    .or(page.getByText('Continue', { exact: false }))
    .or(page.getByText('Send', { exact: false }))
    .or(page.getByText('Email me', { exact: false }))
    .or(page.locator('button'))
    .first();

  if (await isVisible(submitButton, 5000)) {
    const clicked = await clickSafely(submitButton, 'Submit / Send');
    if (clicked) {
      return true;
    }
  }

  console.log('⚠️ 没找到提交按钮，尝试按 Enter');
  await emailInput.press('Enter');
  return true;
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

    await page.waitForTimeout(8000);
    await safeScreenshot(page, 'send-open.png');

    let emailInput = await findEmailInput(page);

    if (!emailInput) {
      await clickEmailMeLink(page);
      await safeScreenshot(page, 'send-after-click-email-link.png');

      console.log('⌛ 等待邮箱输入框...');
      emailInput = await findEmailInput(page);
    }

    if (!emailInput) {
      console.log('❌ 仍然没有找到邮箱输入框');
      await safeScreenshot(page, 'send-no-email-input.png');
      process.exitCode = 1;
      return;
    }

    await submitEmail(page, emailInput);

    await page.waitForTimeout(10000);
    await safeScreenshot(page, 'send-result.png');

    console.log('✅ 邮件发送流程完成');
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
