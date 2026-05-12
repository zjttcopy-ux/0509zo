const { chromium } = require('playwright');

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',

  waitAfterEnterWorkspace: 60000,

  headless: true,

  // ✅ 只有 yml 第一次循环传入 INIT_TMUX=1 时才执行
  runTmuxInit: process.env.INIT_TMUX === '1',

  // ✅ 进入工作区终端后运行的命令
  tmuxCommand: "su - ttt0090 -c 'tmux new -A -s main'",
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

async function clickSafely(locator, name) {
  try {
    console.log(`👉 尝试普通点击：${name}`);
    await locator.click({
      timeout: 5000,
    });
    return true;
  } catch (err) {
    console.log(`⚠️ 普通点击失败：${name}`);
  }

  try {
    console.log(`👉 尝试强制点击：${name}`);
    await locator.click({
      timeout: 5000,
      force: true,
    });
    return true;
  } catch (err) {
    console.log(`⚠️ 强制点击失败：${name}`);
  }

  return false;
}

/**
 * 新版工作区点击逻辑
 */
async function selectWorkspaceIfNeeded(page) {
  console.log('🔎 检查是否出现工作区选择页面...');

  const title = page.getByText('Your Zo Computers', { exact: false });
  const hint = page.getByText('Choose a workspace to continue', { exact: false });
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
  const nameText = page.getByText(CONFIG.workspaceName, { exact: false });

  const hasWorkspacePage =
    await isVisible(title, 5000) ||
    await isVisible(hint, 5000) ||
    await isVisible(domainText, 5000) ||
    await isVisible(nameText, 5000);

  if (!hasWorkspacePage) {
    console.log('ℹ️ 未检测到工作区选择页面');
    return false;
  }

  console.log('🏢 检测到工作区选择页面');
  console.log(`🎯 准备点击工作区：${CONFIG.workspaceDomain}`);

  await safeScreenshot(page, 'workspace-before-click.png');

  /**
   * 第一种：
   * 直接点击完整域名文字。
   */
  if (await isVisible(domainText, 5000)) {
    console.log(`✅ 页面上看到了完整域名：${CONFIG.workspaceDomain}`);

    const clickedDomain = await clickSafely(domainText.first(), CONFIG.workspaceDomain);

    if (clickedDomain) {
      console.log(`✅ 已点击完整域名：${CONFIG.workspaceDomain}`);

      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-click.png');

      return true;
    }
  }

  /**
   * 第二种：
   * 点击工作区名称 ttt0090。
   */
  if (await isVisible(nameText, 5000)) {
    console.log(`✅ 页面上看到了工作区名称：${CONFIG.workspaceName}`);

    const clickedName = await clickSafely(nameText.first(), CONFIG.workspaceName);

    if (clickedName) {
      console.log(`✅ 已点击工作区名称：${CONFIG.workspaceName}`);

      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-click.png');

      return true;
    }
  }

  /**
   * 第三种：
   * 用 JavaScript 找包含 ttt0090.zo.computer 的元素，然后点击最近的父级。
   */
  try {
    console.log('👉 尝试用 JS 查找并点击工作区元素...');

    const jsClicked = await page.evaluate((domain) => {
      const all = Array.from(document.querySelectorAll('*'));

      const target = all.find(el => {
        const text = el.textContent || '';
        return text.includes(domain);
      });

      if (!target) {
        return false;
      }

      let el = target;

      for (let i = 0; i < 8; i++) {
        if (!el) break;

        const rect = el.getBoundingClientRect();

        if (rect.width > 200 && rect.height > 40) {
          el.click();
          return true;
        }

        el = el.parentElement;
      }

      target.click();
      return true;
    }, CONFIG.workspaceDomain);

    if (jsClicked) {
      console.log('✅ JS 已点击工作区元素');

      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-js-click.png');

      return true;
    }

    console.log('⚠️ JS 没找到完整域名元素');
  } catch (err) {
    console.log('⚠️ JS 点击工作区失败');
  }

  /**
   * 第四种：
   * 坐标点击。
   */
  try {
    console.log('👉 尝试坐标点击工作区卡片...');

    await page.mouse.click(195, 300);

    console.log('✅ 已执行坐标点击工作区卡片');

    await page.waitForTimeout(8000);
    await safeScreenshot(page, 'workspace-after-coordinate-click.png');

    return true;
  } catch (err) {
    console.log('⚠️ 坐标点击失败');
  }

  console.log('❌ 检测到工作区页面，但未能点击工作区');
  await safeScreenshot(page, 'workspace-click-failed.png');

  return false;
}

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
 * ✅ 第一次进入工作区后：
 * 自动打开终端并运行：
 * su - ttt0090 -c 'tmux new -A -s main'
 */
async function openTerminalAndRunTmux(page) {
  if (!CONFIG.runTmuxInit) {
    console.log('ℹ️ 当前不是第一次循环，跳过 tmux 初始化');
    return false;
  }

  console.log('🖥️ 检测到 INIT_TMUX=1，准备打开终端并运行 tmux 命令...');
  await safeScreenshot(page, 'before-terminal-init.png');

  try {
    /**
     * 方法一：
     * 尝试找 Terminal / 终端 / New Terminal 按钮
     */
    const terminalButton = page
      .getByText('Terminal', { exact: false })
      .or(page.getByText('终端', { exact: false }))
      .or(page.getByText('New Terminal', { exact: false }))
      .or(page.locator('[aria-label*="Terminal"]'))
      .or(page.locator('[title*="Terminal"]'))
      .first();

    if (await isVisible(terminalButton, 8000)) {
      console.log('✅ 找到 Terminal / 终端 按钮，尝试点击...');
      await clickSafely(terminalButton, 'Terminal');
      await page.waitForTimeout(5000);
    } else {
      console.log('⚠️ 没找到明显 Terminal 按钮，尝试快捷键 Ctrl+` 打开终端...');

      /**
       * 很多 Web IDE / VS Code 风格页面：
       * Ctrl + ` 可以打开终端
       */
      await page.keyboard.press('Control+`');
      await page.waitForTimeout(5000);
    }

    await safeScreenshot(page, 'after-open-terminal.png');

    /**
     * 聚焦终端输入区域
     */
    try {
      const terminalArea = page
        .locator('.xterm-helper-textarea')
        .or(page.locator('.xterm'))
        .or(page.locator('[class*="terminal"]'))
        .or(page.locator('textarea'))
        .first();

      if (await isVisible(terminalArea, 8000)) {
        console.log('✅ 找到终端输入区域，点击聚焦...');
        await terminalArea.click({
          timeout: 5000,
          force: true,
        });
      } else {
        console.log('⚠️ 没找到终端输入区域，尝试点击页面下半部分...');
        await page.mouse.click(195, 700);
      }
    } catch {
      console.log('⚠️ 聚焦终端失败，尝试坐标点击...');
      await page.mouse.click(195, 700);
    }

    await page.wait
