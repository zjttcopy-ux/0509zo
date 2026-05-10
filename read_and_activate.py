import imaplib
import email
import re
import os
import time
import requests
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


# ✅ 只匹配 zo 链接
def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s]+'
    match = re.search(pattern, text)
    return match.group(0) if match else None


# ✅ 安全解析邮件
def get_mail_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() in ["text/plain", "text/html"]:
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


def is_recent(msg, minutes=60):
    """✅ 判断是否是最近N分钟邮件"""
    date_tuple = msg.get("Date")
    if not date_tuple:
        return False

    try:
        msg_date = parsedate_to_datetime(date_tuple)

        # 转成 UTC 对比
        now = datetime.now(msg_date.tzinfo)
        delta = now - msg_date

        return delta <= timedelta(minutes=minutes)

    except Exception as e:
        print("⚠️ 时间解析失败:", e)
        return False


def run():
    print("📡 连接邮箱...")

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)
    mail.select("inbox")

    status, messages = mail.search(None, "UNSEEN")
    mail_ids = messages[0].split()

    print(f"📬 未读邮件数量: {len(mail_ids)}")

    for num in mail_ids:
        status, data = mail.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])

        # ✅ ✅ 关键过滤：只要最近1小时
        if not is_recent(msg, minutes=60):
            print("⏩ 跳过旧邮件")
            continue

        body = get_mail_body(msg)

        print("📩 解析邮件完成")

        link = extract_link(body)

        if link:
            print("✅ 找到激活链接：")
            print(link)

            try:
                r = requests.get(link, timeout=10)
                print("🌐 状态码:", r.status_code)

                # ✅ 删除已处理邮件
                mail.store(num, "+FLAGS", "\\Deleted")
                print("🗑 已删除邮件")

            except Exception as e:
                print("❌ 请求失败:", e)

        else:
            print("⚠️ 没找到 zo 链接")

    mail.expunge()
    mail.logout()

    print("✅ 处理完成")


print("⏳ 等待邮件...")
time.sleep(20)

run()
