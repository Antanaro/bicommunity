import json
import os
import re
import sys
import urllib.error
import urllib.request


def load_bot_token() -> str:
    # Prefer explicit env var if present (useful in CI / containers)
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token:
        return token.strip()

    # Fallback: read from .env in current working directory
    env_path = os.path.join(os.getcwd(), ".env")
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN not found in environment and .env file not found."
        )

    m = re.search(r"^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+?)\s*$", content, re.MULTILINE)
    if not m:
        raise RuntimeError("TELEGRAM_BOT_TOKEN not found in .env")

    return m.group(1).strip().strip('"').strip("'")


def fetch_updates(token: str) -> dict:
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_me(token: str) -> dict:
    url = f"https://api.telegram.org/bot{token}/getMe"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_webhook_info(token: str) -> dict:
    url = f"https://api.telegram.org/bot{token}/getWebhookInfo"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def delete_webhook(token: str, drop_pending_updates: bool = False) -> dict:
    url = f"https://api.telegram.org/bot{token}/deleteWebhook"
    payload = json.dumps({"drop_pending_updates": drop_pending_updates}).encode("utf-8")
    req = urllib.request.Request(
        url,
        method="POST",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    try:
        token = load_bot_token()
        me = fetch_me(token)
        webhook = fetch_webhook_info(token)
        data = fetch_updates(token)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTPError {e.code}: {body}")
        return 2
    except Exception as e:
        print(f"Error: {e}")
        return 2

    print("getMe:")
    print(json.dumps(me, ensure_ascii=False, indent=2))
    print("\ngetWebhookInfo:")
    print(json.dumps(webhook, ensure_ascii=False, indent=2))
    webhook_url = (webhook.get("result") or {}).get("url") if isinstance(webhook, dict) else None
    if webhook_url:
        print("\nОбнаружен webhook URL — отключаю webhook, чтобы работал getUpdates...")
        try:
            del_res = delete_webhook(token, drop_pending_updates=False)
            print("deleteWebhook:")
            print(json.dumps(del_res, ensure_ascii=False, indent=2))
            # Retry updates after webhook removal
            data = fetch_updates(token)
        except Exception as e:
            print(f"Не удалось отключить webhook: {e}")
    print("\ngetUpdates:")
    print(json.dumps(data, ensure_ascii=False, indent=2))

    result = data.get("result") or []
    if not result:
        print(
            "\nНет апдейтов. Убедитесь, что вы написали ИМЕННО этому боту (смотрите username в getMe), "
            "в личные сообщения: нажмите Start / отправьте любое сообщение, затем запустите скрипт снова."
        )
        return 1

    # Collect chat ids from messages / channel posts, etc.
    seen = []
    for upd in result:
        msg = upd.get("message") or upd.get("edited_message") or upd.get("channel_post") or upd.get("edited_channel_post")
        if not msg:
            continue
        chat = msg.get("chat") or {}
        chat_id = chat.get("id")
        if chat_id is None:
            continue
        from_user = msg.get("from") or {}
        entry = {
            "chat_id": chat_id,
            "chat_type": chat.get("type"),
            "chat_username": chat.get("username"),
            "from_username": from_user.get("username"),
            "from_id": from_user.get("id"),
            "text": msg.get("text"),
        }
        seen.append(entry)

    if seen:
        print("\nНайденные chat.id (скопируйте нужный для TELEGRAM_ADMIN_ID):")
        for e in seen:
            print(
                f"- chat_id={e['chat_id']} chat_type={e.get('chat_type')} "
                f"from=@{e.get('from_username')} from_id={e.get('from_id')} text={repr(e.get('text'))}"
            )
    else:
        print("\nАпдейты есть, но сообщений с chat.id не найдено (необычный тип апдейта).")

    return 0


if __name__ == "__main__":
    sys.exit(main())

