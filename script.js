const { chromium } = require('playwright');

const CONFIG = {
  url: 'https://www.zo.computer/signup?handle=ttt0090',
  email: 'ttt0090@gmail.com',

  // 优先按工作区域名判断和点击
  workspaceDomain: 'ttt0090.zo.computer',

  // 兜底名称
  workspaceName: 'ttt0090',

  headless: true,
};

/**
 * 判断元素是否可见
 */
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

/**
 * 安全截图
 */
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
 * 点击工作区
 *
 * 说明：
 * 现在不再把工作区页面当成“已经完成”的状态。
 * 只要出现 ttt0090.zo.computer，就点击进入。
 */
async function selectWorkspaceIfNeeded(page) {
  console.log('🔎 检查是否出现工作区选择页面...');

  const title = page.getByText('Your Zo Computers', { exact: false });
  const hint = page.getByText('Choose a workspace to continue', { exact: false });
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });

  const hasWorkspacePage =
    await isVisible(title, 3000) ||
    await isVisible(hint, 3000) ||
    await isVisible(domainText, 3000);

  if (!hasWorkspacePage) {
    console.log('ℹ️ 未检测到工作区选择页面');
    return false;
  }

  console.log('🏢 检测到工作区选择页面');
  console.log(`🎯 准备选择工作区：${CONFIG.workspaceDomain}`);

  await safeScreenshot(page, 'workspace-before-click.png');

  /**
   * 第一优先级：
   * 点击包含完整域名 ttt0090.zo.computer 的卡片。
   *
   * 不只点击文字，而是找包含这个域名的上层块。
   */
  const workspaceCardByDomain = page.locator('div').filter({
    hasText: CONFIG.workspaceDomain,
  }).first();

  if (await isVisible(workspaceCardByDomain, 5000)) {
    console.log(`✅ 找到工作区域名：${CONFIG.workspaceDomain}`);
    await workspaceCardByDomain.click();

    console.log('⏳ 已点击工作区，等待页面进入工作区...');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(8000);

    await safeScreenshot(page, 'workspace-after-click.png');

    console.log('✅ 已进入工作区');
    return true;
  }

  /**
   * 第二优先级：
   * 如果完整域名没找到，找任何包含 .zo.computer 的工作区卡片。
   */
  console.log('⚠️ 没有找到完整工作区域名，尝试点击第一个包含 .zo.computer 的工作区');

  const workspaceCardByZoDomain = page.locator('div').filter({
    hasText: /\.zo\.computer/,
  }).first();

  if (await isVisible(workspaceCardByZoDomain, 5000)) {
    const cardText = await workspaceCardByZoDomain.innerText().catch(() => '');
    console.log('📌 找到工作区卡片内容：');
    console.log(cardText);

    await workspaceCardByZoDomain.click();

    console.log('⏳ 已点击工作区，等待页面进入工作区...');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(8000);

    await safeScreenshot(page, 'workspace-after-click.png');

    console.log('✅ 已进入第一个 .zo.computer 工作区');
    return true;
  }

  /**
   * 第三优先级：
   * 兜底点击 ttt0090。
   */
  console.log(`⚠️ 没找到 .zo.computer，尝试通过名称点击：${CONFIG.workspaceName}`);

  const workspaceByName = page.getByText(CONFIG.workspaceName, { exact: false });

  if (await isVisible(workspaceByName, 5000)) {
    await workspaceByName.click();

    console.log('⏳ 已点击工作区名称，等待页面进入工作区...');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(8000);

    await safeScreenshot(page, 'workspace-after-click.png');

    console.log(`✅ 已通过名称进入工作区：${CONFIG.workspaceName}`);
    return true;
  }

  console.log('❌ 检测到工作区页面，但没有成功点击任何工作区');
  await safeScreenshot(page, 'workspace-click-failed.png');

  return false;
}

/**
 * 如果需要登录，则发送邮箱登录链接
 */
async function sendEmailLinkIfNeeded(page) {
  console.log('🔎 检查是否需要发送邮箱登录链接...');

  const emailMeLinkButton = page.getByText('Email me a link', { exact: false });

  const needEmailLogin = await isVisible(emailMeLinkButton, 8000);

  if (!needEmailLogin) {
    console.log('ℹ️ 没有发现 Email me a link 按钮');
    return false;
  }

  console.log("📨 点击 'Email me a link'...");
  await emailMeLinkButton.click();

  console.log('⌛ 等待邮箱输入框...');
  const emailInput = page.locator('input[type="email"], input').first();

  await emailInput.waitFor({
    state: 'visible',
    timeout: 10000,
  });

  console.log(`✉️ 输入邮箱：${CONFIG.email}`);
  await emailInput.fill(CONFIG.email);

  console.log('📤 提交邮箱登录请求...');
  await page.keyboard.press('Enter');

  await page.waitForTimeout(5000);

  console.log('✅ 邮件登录链接请求已发送');
  return true;
}

/**
 * 主流程
 */
async function runOnce() {
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
    console.log('🚀 开始执行：', new Date().toLocaleString());

    console.log('🌐 访问页面...');
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await safeScreenshot(page, 'step-01-open.png');

    /**
     * 第一步：
     * 如果出现工作区选择页面，直接点击进入。
     *
     * 这一步是针对你发的截图：
     * Your Zo Computers
     * Choose a workspace to continue.
     * ttt0090.zo.computer
     */
    const selectedWorkspace = await selectWorkspaceIfNeeded(page);

    if (selectedWorkspace) {
      console.log('✅ 工作区已选择，等待机器状态变化...');

      /**
       * 你说进入工作区后离线机器也可能重新启动，
       * 所以这里不再额外乱点任何按钮。
       * 只等待一段时间，让网站自己处理。
       */
      await page.waitForTimeout(15000);

      await safeScreenshot(page, 'result.png');

      console.log('✅ 已进入工作区并等待完成');
      return;
    }

    /**
     * 第二步：
     * 如果没有工作区选择页，说明可能还没登录。
     * 那么走原来的邮箱登录流程。
     */
    const sentEmail = await sendEmailLinkIfNeeded(page);

    if (sentEmail) {
      await safeScreenshot(page, 'result.png');

      console.log('✅ 邮件发送流程完成');
      console.log('📬 请检查邮箱中的登录链接');
      return;
    }

    /**
     * 第三步：
     * 有些时候页面加载慢，邮箱按钮或工作区页面可能晚一点出现。
     * 等几秒再判断一次工作区。
     */
    console.log('🔁 等待后再次检查工作区页面...');
    await page.waitForTimeout(5000);

    const selectedWorkspaceAgain = await selectWorkspaceIfNeeded(page);

    if (selectedWorkspaceAgain) {
      console.log('✅ 第二次检测时已选择工作区');

      await page.waitForTimeout(50000);

      await safeScreenshot(page, 'result.png');

      console.log('✅ 已进入工作区并等待完成');
      return;
    }

    console.log('⚠️ 当前页面既不是工作区选择页，也不是邮箱登录页');
    await safeScreenshot(page, 'unknown-page.png');

  } catch (err) {
    console.error('❌ 执行失败:', err);

    await safeScreenshot(page, 'error.png');

  } finally {
    await browser.close();
    console.log('🔚 浏览器关闭');
  }
}

/**
 * 只执行一次
 */
runOnce();
