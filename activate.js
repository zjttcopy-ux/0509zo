const { chromium } = require('playwright');

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',

  // 如果进入工作区后网站会自动唤醒机器，这里等待一段时间即可
  waitAfterEnterWorkspace: 30000,

  headless: true,
};

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

/**
 * 选择 Zo Computer 工作区
 */
async function selectWorkspaceIfNeeded(page) {
  console.log('🔎 检查是否出现工作区选择页面...');

  const title = page.getByText('Your Zo Computers', { exact: false });
  const hint = page.getByText('Choose a workspace to continue', { exact: false });
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });

  const hasWorkspacePage =
    await isVisible(title, 5000) ||
    await isVisible(hint, 5000) ||
    await isVisible(domainText, 5000);

  if (!hasWorkspacePage) {
    console.log('ℹ️ 未检测到工作区选择页面');
    return false;
  }

  console.log('🏢 检测到工作区选择页面');
  console.log(`🎯 准备点击工作区：${CONFIG.workspaceDomain}`);

  await safeScreenshot(page, 'workspace-before-click.png');

  /**
   * 第一优先级：
   * 找包含完整域名 ttt0090.zo.computer 的卡片。
   */
  const workspaceCardByDomain = page.locator('div').filter({
    hasText: CONFIG.workspaceDomain,
  }).first();

  if (await isVisible(workspaceCardByDomain, 8000)) {
    await workspaceCardByDomain.click();

    console.log(`✅ 已点击工作区：${CONFIG.workspaceDomain}`);

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(5000);

    await safeScreenshot(page, 'workspace-after-click.png');

    return true;
  }

  /**
   * 第二优先级：
   * 找任意包含 .zo.computer 的工作区。
   */
  console.log('⚠️ 未找到完整域名，尝试点击第一个 .zo.computer 工作区');

  const workspaceCardByZoDomain = page.locator('div').filter({
    hasText: /\.zo\.computer/,
  }).first();

  if (await isVisible(workspaceCardByZoDomain, 8000)) {
    const cardText = await workspaceCardByZoDomain.innerText().catch(() => '');
    console.log('📌 找到工作区卡片：');
    console.log(cardText);

    await workspaceCardByZoDomain.click();

    console.log('✅ 已点击第一个 .zo.computer 工作区');

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(5000);

    await safeScreenshot(page, 'workspace-after-click.png');

    return true;
  }

  /**
   * 第三优先级：
   * 兜底点击 ttt0090。
   */
  console.log(`⚠️ 未找到 .zo.computer，尝试点击名称：${CONFIG.workspaceName}`);

  const workspaceByName = page.getByText(CONFIG.workspaceName, { exact: false });

  if (await isVisible(workspaceByName, 8000)) {
    await workspaceByName.click();

    console.log(`✅ 已点击工作区名称：${CONFIG.workspaceName}`);

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(5000);

    await safeScreenshot(page, 'workspace-after-click.png');

    return true;
  }

  console.log('❌ 检测到工作区页面，但未能点击工作区');
  await safeScreenshot(page, 'workspace-click-failed.png');

  return false;
}

/**
 * 兼容旧页面：
 * 如果进入后仍然出现 Start machine / Run / 开始 按钮，就点击。
 *
 * 但是现在不会强制等待这个按钮。
 * 找不到按钮也不会报错。
 */
async function clickStartButtonIfExists(page) {
  console.log('🔎 检查是否还有启动按钮...');

  const startButton = page
    .locator('text=Start machine')
    .or(page.locator('text=Run'))
    .or(page.locator('text=开始'))
    .first();

  const hasStartButton = await isVisible(startButton, 8000);

  if (!hasStartButton) {
    console.log('ℹ️ 未发现 Start machine / Run / 开始 按钮');
    console.log('ℹ️ 新版页面可能进入工作区后自动启动，不再强制点击按钮');
    return false;
  }

  console.log('🚀 发现启动按钮，准备点击...');
  await startButton.click();

  await page.waitForTimeout(10000);

  console.log('✅ 已点击启动按钮');
  await safeScreenshot(page, 'after-start-click.png');

  return true;
}

/**
 * 主激活流程
 */
async function run() {
  const activationUrl = process.argv[2];

  if (!activationUrl) {
    console.error('❌ 没有传入激活链接');
    process.exit(1);
  }

  console.log('🚀 启动浏览器执行激活...');
  console.log('🌐 打开激活链接...');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    await page.goto(activationUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(5000);
    await safeScreenshot(page, 'activate-open.png');

    /**
     * 新逻辑：
     * 激活链接打开后，优先处理工作区选择页面。
     */
    const selectedWorkspace = await selectWorkspaceIfNeeded(page);

    if (selectedWorkspace) {
      console.log('✅ 已进入工作区');

      /**
       * 进入工作区后不要再强制等 Start machine。
       * 因为你说离线机器进入工作区后也会自己重新启动。
       */
      console.log(`⏳ 等待 ${CONFIG.waitAfterEnterWorkspace / 1000} 秒，让网站自动处理机器启动...`);
      await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);

      /**
       * 兼容旧页面：
       * 如果这时候仍然有启动按钮，就点一下。
       * 如果没有，也算成功，不再报错。
       */
      await clickStartButtonIfExists(page);

      await safeScreenshot(page, 'result.png');

      console.log('✅ 激活流程完成');
      return;
    }

    /**
     * 如果没有出现工作区选择页面，
     * 说明可能还是旧页面，尝试点击旧的启动按钮。
     */
    console.log('ℹ️ 未出现工作区选择页，尝试兼容旧启动按钮逻辑');

    const clickedStart = await clickStartButtonIfExists(page);

    if (clickedStart) {
      await safeScreenshot(page, 'result.png');
      console.log('✅ 旧页面启动流程完成');
      return;
    }

    /**
     * 如果既没有工作区，也没有启动按钮，不直接报失败。
     * 可能页面已经自动完成。
     */
    console.log('⚠️ 未发现工作区，也未发现启动按钮');
    console.log('⚠️ 可能已经自动完成，保存截图供检查');

    await safeScreenshot(page, 'unknown-page.png');

    console.log('✅ 脚本结束，不再因为找不到按钮而失败');

  } catch (err) {
    console.error('❌ 激活失败:', err);

    await safeScreenshot(page, 'activate-error.png');

    process.exitCode = 1;

  } finally {
    await browser.close();
    console.log('🔚 浏览器关闭');
  }
}

run();
