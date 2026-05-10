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


def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s]+'
    match = re.search(pattern, text)
    return match.group(0) if match else None


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


# ✅ ✅ 精确判断：只要最近1小时
def is_within_last_hour(msg):
    try:
        msg_date = parsedate_to_datetime(msg["Date"])
        now = datetime.now(msg_date.tzinfo)
        return (now - msg_date) <= timedelta(hours=1)
    except:
        return False


def run():
    print("📡 连接邮箱...")

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)
    mail.select("inbox")

    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    # ✅ IMAP 只查今天/可能的昨天（缩小范围）
    since_date = one_hour_ago.strftime("%d-%b-%Y")
    print("🔎 搜索起始日期:", since_date)

    status, messages = mail.search(None, f'(SINCE "{since_date}" UNSEEN)')
    mail_ids = messages[0].split()

    print(f"📬 候选邮件数量: {len(mail_ids)}")

    for num in mail_ids:
        status, data = mail.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])

        # ✅ ✅ 核心过滤：仅最近1小时
        if not is_within_last_hour(msg):
            continue

        print("✅ 命中最近1小时邮件")

        body = get_body(msg)

        link = extract_link(body)

        if link:
            print("✅ 找到链接:", link)

            try:
                r = requests.get(link, timeout=10)
                print("🌐 状态:", r.status_code)

                # ✅ 删除处理过邮件
                mail.store(num, "+FLAGS", "\\Deleted")

            except Exception as e:
                print("❌ 请求失败:", e)

    mail.expunge()
    mail.logout()

    print("✅ 完成")


print("⏳ 等待邮件到达...")
time.sleep(20)

run()
