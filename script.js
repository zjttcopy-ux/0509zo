const { chromium } = require('playwright');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runOnce(round) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`🚀 第 ${round} 次执行开始：`, new Date().toLocaleString());

    console.log("正在访问页面...");
    await page.goto(
      'https://www.zo.computer/signup?handle=ttt0090',
      { waitUntil: 'networkidle' }
    );

    console.log("正在点击 'Email me a link' 按钮...");
    await page.click('text="Email me a link"');

    console.log("等待邮箱输入框...");
    const emailInput = page.locator('input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log("正在输入邮箱...");
    await emailInput.fill('ttt0090@gmail.com');

    console.log("提交请求...");
    await page.keyboard.press('Enter');

    await page.waitForTimeout(5000);

    const resultPath = `result_${round}.png`;
    await page.screenshot({ path: resultPath });
    console.log(`✅ 第 ${round} 次执行完成，截图：${resultPath}`);

  } catch (err) {
    const errorPath = `error_${round}.png`;
    console.error(`❌ 第 ${round} 次执行失败`, err);
    await page.screenshot({ path: errorPath });
  } finally {
    await browser.close();
  }
}

(async () => {
  const TOTAL_RUNS = 36;
  const INTERVAL_MS = 10 * 60 * 1000; // 1 小时

  for (let i = 1; i <= TOTAL_RUNS; i++) {
    await runOnce(i);

    if (i < TOTAL_RUNS) {
      console.log("⏳ 等待 1 小时后进行下一次执行...");
      await sleep(INTERVAL_MS);
    }
  }

  console.log("🎉 六小时任务全部完成");
})();
