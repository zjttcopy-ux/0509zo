const { chromium } = require('playwright');

async function run(link) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("🌐 打开激活链接...");
    await page.goto(link, { waitUntil: 'networkidle' });

    console.log("⌛ 等待按钮加载...");

    // ✅ 根据实际按钮文本匹配（可能需要调整）
    const btn = page.locator('text=Start machine, text=Run, text=开始');

    await btn.first().waitFor({ timeout: 15000 });

    console.log("🖱 点击启动按钮...");
    await btn.first().click();

    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'activated.png' });

    console.log("✅ 机器已启动");

  } catch (e) {
    console.log("❌ 激活失败:", e);
    await page.screenshot({ path: 'activate_error.png' });
  } finally {
    await browser.close();
  }
}

// ✅ 从命令行获取链接
const link = process.argv[2];

if (!link) {
  console.error("❌ 未提供链接");
  process.exit(1);
}

run(link);
