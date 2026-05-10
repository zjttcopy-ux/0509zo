import imaplib
import email
import re
import os
import time
import subprocess

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


# ✅ 只匹配 zo 激活链接
def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s]+'
    match = re.search(pattern, text)
    return match.group(0) if match else None


# ✅ 安全解析邮件内容（避免编码报错）
def get_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() in ["text/plain", "text/html"]:
                payload = part.get_payload(decode=True)
                if payload:
                    try:
                        body += payload.decode("utf-8")
                    except:
                        body += payload.decode(errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            try:
                body = payload.decode("utf-8")
            except:
                body = payload.decode(errors="ignore")

    return body


def run():
    print("📡 连接邮箱...")

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)
    mail.select("inbox")

    # ✅ 查今天邮件（避免扫描整个历史）
    status, messages = mail.search(None, '(SINCE "10-May-2026")')
    mail_ids = messages[0].split()

    print(f"📬 搜索结果数量: {len(mail_ids)}")

    # ✅ ✅ 关键：只取最新10封邮件（避免卡死）
    mail_ids = mail_ids[-10:]

    print(f"✅ 实际处理数量: {len(mail_ids)}")

    for num in mail_ids:
        status, data = mail.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])

        body = get_body(msg)

        link = extract_link(body)

        if not link:
            print("⏭ 没有匹配链接，跳过")
            continue

        print("✅ 找到激活链接：")
        print(link)

        # ✅ ✅ ✅ 关键：调用 Playwright 点击按钮
        print("🚀 启动浏览器执行激活...")

        try:
            result = subprocess.run(
                ["node", "activate.js", link],
                capture_output=True,
                text=True
            )

            print("👉 activate.js 输出：")
            print(result.stdout)

            if result.stderr:
                print("⚠️ 错误信息：")
                print(result.stderr)

            # ✅ 删除已处理邮件（避免重复）
            mail.store(num, "+FLAGS", "\\Deleted")
            print("🗑 已删除邮件")

        except Exception as e:
            print("❌ 执行 activate.js 失败:", e)

    mail.expunge()
    mail.logout()

    print("✅ 全部完成")


# ✅ 等待邮件到达
print("⏳ 等待邮件...")
time.sleep(20)

run()
