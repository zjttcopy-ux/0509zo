const { chromium } = require('playwright');

async function runOnce() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🚀 开始执行：", new Date().toLocaleString());

    console.log("🌐 访问注册页面...");
    await page.goto(
      'https://www.zo.computer/signup?handle=ttt0090',
      { waitUntil: 'networkidle' }
    );

    console.log("📨 点击 'Email me a link'...");
    await page.click('text="Email me a link"');

    console.log("⌛ 等待邮箱输入框...");
    const emailInput = page.locator('input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log("✉️ 输入邮箱...");
    await emailInput.fill('ttt0090@gmail.com');

    console.log("📤 提交请求...");
    await page.keyboard.press('Enter');

    // ✅ 稍微等几秒确保请求发出
    await page.waitForTimeout(5000);

    // ✅ 截图方便调试
    await page.screenshot({ path: 'result.png' });

    console.log("✅ 邮件发送成功");

  } catch (err) {
    console.error("❌ 执行失败:", err);

    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
    console.log("🔚 浏览器关闭");
  }
}

// ✅ 只执行一次（关键点）
runOnce();
