import imaplib
import email
import re
import os
import time
import requests

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


# ✅ 只匹配 zo 链接
def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s]+'
    match = re.search(pattern, text)
    return match.group(0) if match else None


# ✅ ✅ 安全解析邮件（支持多编码，已修复报错）
def get_mail_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()

            if content_type in ["text/plain", "text/html"]:
                payload = part.get_payload(decode=True)

                if payload:
                    try:
                        body += payload.decode("utf-8")
                    except:
                        try:
                            body += payload.decode("gbk")
                        except:
                            body += payload.decode(errors="ignore")
    else:
        payload = msg.get_payload(decode=True)

        if payload:
            try:
                body = payload.decode("utf-8")
            except:
                try:
                    body = payload.decode("gbk")
                except:
                    body = payload.decode(errors="ignore")

    return body


def run():
    print("📡 连接邮箱...")

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)

    mail.select("inbox")

    # ✅ 只找未读邮件
    status, messages = mail.search(None, "UNSEEN")
    mail_ids = messages[0].split()

    print(f"📬 未读邮件数量: {len(mail_ids)}")

    for num in mail_ids:
        status, data = mail.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])

        body = get_mail_body(msg)

        print("📩 邮件解析完成")

        link = extract_link(body)

        if link:
            print("✅ 找到激活链接：")
            print(link)

            try:
                r = requests.get(link, timeout=10)
                print("🌐 访问状态码:", r.status_code)

                # ✅ 无论成功/失败都删除（避免重复）
                mail.store(num, "+FLAGS", "\\Deleted")
                print("🗑 邮件已删除")

            except Exception as e:
                print("❌ 请求失败:", e)

        else:
            print("⚠️ 没有找到 zo 激活链接，跳过")

    # ✅ 真正删除
    mail.expunge()

    mail.logout()
    print("✅ 邮箱处理完成")


# ✅ 等待邮件到达
print("⏳ 等待邮件到达...")
time.sleep(20)

run()
