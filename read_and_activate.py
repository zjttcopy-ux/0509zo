import imaplib
import email
import re
import os
import time
import requests

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s]+'
    match = re.search(pattern, text)
    return match.group(0) if match else None

def run():
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(EMAIL, PASSWORD)
    mail.select("inbox")

    status, messages = mail.search(None, 'UNSEEN')

    for num in messages[0].split():
        status, data = mail.fetch(num, "(RFC822)")
        msg = email.message_from_bytes(data[0][1])

        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode()
        else:
            body = msg.get_payload(decode=True).decode()

        link = extract_link(body)

        if link:
            print("✅ 找到链接:", link)

            try:
                r = requests.get(link, timeout=10)
                print("访问状态:", r.status_code)

                # ✅ 删除邮件（避免重复）
                mail.store(num, '+FLAGS', '\\Deleted')

            except Exception as e:
                print("请求失败:", e)

    mail.expunge()
    mail.logout()


print("⏳ 等待邮件...")
time.sleep(15)

run()
