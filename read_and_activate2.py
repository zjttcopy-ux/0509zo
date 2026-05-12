import imaplib
import email
import re
import os
import time
import subprocess
import html
from datetime import datetime, timedelta

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


def extract_link(text):
    if not text:
        return None

    text = html.unescape(text)

    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s<>"\']+'
    matches = re.findall(pattern, text)

    if not matches:
        return None

    link = matches[0]
    link = link.replace("&amp;", "&")
    link = link.strip()

    return link


def get_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()

            if content_type in ["text/plain", "text/html"]:
                payload = part.get_payload(decode=True)

                if payload:
                    charset = part.get_content_charset() or "utf-8"

                    try:
                        body += payload.decode(charset, errors="ignore")
                    except Exception:
                        body += payload.decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)

        if payload:
            charset = msg.get_content_charset() or "utf-8"

            try:
                body += payload.decode(charset, errors="ignore")
            except Exception:
                body += payload.decode("utf-8", errors="ignore")

    return body


def run():
    print("📡 连接邮箱...")

    if not PASSWORD:
        print("❌ 没有读取到 EMAIL_PASSWORD，请检查 GitHub Secrets 里的 PASSWORD")
        return

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)

    try:
        mail.login(EMAIL, PASSWORD)
        mail.select("inbox")

        since_date = (datetime.now() - timedelta(days=3)).strftime("%d-%b-%Y")
        print(f"🔎 搜索日期范围：SINCE {since_date}")

        status, messages = mail.search(None, f'(SINCE "{since_date}")')

        if status != "OK":
            print("❌ 邮件搜索失败")
            return

        mail_ids = messages[0].split()

        print(f"📬 搜索结果数量: {len(mail_ids)}")

        if not mail_ids:
            print("⚠️ 邮箱里没有搜索到最近邮件")
            return

        mail_ids = mail_ids[-50:]

        print(f"✅ 实际处理数量: {len(mail_ids)}")

        found_link = False

        for num in reversed(mail_ids):
            status, data = mail.fetch(num, "(RFC822)")

            if status != "OK" or not data:
                print("⚠️ 读取邮件失败，跳过")
                continue

            if not isinstance(data[0], tuple):
                print("⚠️ 邮件数据格式异常，跳过")
                continue

            msg = email.message_from_bytes(data[0][1])

            subject = msg.get("Subject", "")
            from_addr = msg.get("From", "")

            print("--------------------------------")
            print(f"📧 检查邮件 From: {from_addr}")
            print(f"📧 检查邮件 Subject: {subject}")

            body = get_body(msg)
            link = extract_link(body)

            if not link:
                print("⏭ 没有匹配 zo 激活链接，跳过")
                continue

            found_link = True

            print("✅ 找到 zo 激活链接：")
            print(link)

            print("🚀 启动浏览器执行激活...")

            try:
                env = os.environ.copy()

                print(f"🧩 INIT_TMUX 状态：{env.get('INIT_TMUX', '未设置')}")

                result = subprocess.run(
                    ["node", "activate_workspace.js", link],
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=420
                )

                print("👉 activate_workspace.js 输出：")
                print(result.stdout)

                if result.stderr:
                    print("⚠️ 错误信息：")
                    print(result.stderr)

                if result.returncode == 0:
                    print("✅ activate_workspace.js 执行完成")
                    mail.store(num, "+FLAGS", "\\Deleted")
                    print("🗑 已删除已处理邮件")
                else:
                    print(f"⚠️ activate_workspace.js 返回非0状态码：{result.returncode}")
                    print("⚠️ 因为执行失败，本封邮件不删除，方便下轮重试")

                break

            except subprocess.TimeoutExpired:
                print("❌ activate_workspace.js 执行超时")
                print("⚠️ 超时邮件不删除，方便下轮重试")
                break

            except Exception as e:
                print("❌ 执行 activate_workspace.js 失败:", e)
                print("⚠️ 失败邮件不删除，方便下轮重试")
                break

        if not found_link:
            print("⚠️ 没有找到新的 zo 激活链接")
            print("📌 请确认刚才发送邮件步骤确实让 Zo 发来了新邮件")

        mail.expunge()

    finally:
        try:
            mail.logout()
        except Exception:
            pass

    print("✅ 全部完成")


print("⏳ 等待邮件...")
time.sleep(20)

run()
