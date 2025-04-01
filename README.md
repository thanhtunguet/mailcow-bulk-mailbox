# 📬 Mailcow Bulk Mailbox Creator (TypeScript + Selenium)

Automate the creation of multiple mailboxes in [Mailcow](https://mailcow.email/) using a headless browser powered by **Selenium WebDriver**. This script mimics admin login, fetches CSRF tokens from Mailcow's JavaScript, and performs mailbox creation via Mailcow's internal API.

---

## ✨ Features

- ✅ Automated login using Selenium and Chromium
- 🔑 Secure CSRF token extraction from embedded JS (`var csrf_token = ...`)
- 📬 Bulk mailbox creation via `/api/v1/add/mailbox` with native `fetch`
- 🔍 Opens DevTools with "Preserve log" for debugging
- 🌐 Vietnamese name normalization (removes tones)
- 📁 Reads mailbox data from a JSON file (`users.json`)

---

## 📦 Installation

```bash
git clone https://github.com/thanhtunguet/mailcow-bulk-mailbox.git
cd mailcow-bulk-mailbox
npm install
```

---

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
MAILCOW_URL=https://mail.yourdomain.com
MAILCOW_ADMIN=admin
MAILCOW_PASSWORD=your_admin_password
MAILCOW_DEFAULT_PASSWORD=UserPassword123!
```

---

## 📁 Input File

The script reads user data from `users.json`. Format:

```json
[
  {
    "email": "john@example.com",
    "name": "John Nguyễn"
  },
  {
    "email": "jane@example.com",
    "name": "Jane Phạm"
  }
]
```

---

## 🚀 Running the Script

```bash
npx ts-node src/index.ts
```

> ✅ Chrome will open with DevTools. Watch network activity and console logs in real-time.

---

## 📂 Project Structure

```bash
src/
├── index.ts                 # Main entry script
├── types/
│   ├── email-user.ts       # EmailUser interface
│   └── mailcow-user.ts     # MailcowUser interface
├── users.json              # Mailbox creation data
```

---

## 🧠 How It Works

1. Logs into Mailcow via UI using Selenium.
2. Extracts the CSRF token from inline JS.
3. Calls `/api/v1/add/mailbox` via browser `fetch()`, simulating an admin session.
4. Waits for success, logs each mailbox creation.

---

## 🛠 Development Tips

- You can add more tone mappings in `removeVietnameseTones()` if needed.
- Use `.catch()` blocks to handle custom error reporting.
- Adjust sleep timers if Mailcow server responds slowly.
- Customize user quota, tags, ACLs in the API payload.

---

## 📥 Future Ideas

- Read from `.xlsx` using `xlsx` package
- CLI flags for dry-run, single-user testing
- Headless mode toggle
- Alias and forwarder automation

---

## 📄 License

MIT

---

## 🙋‍♂️ Author

Made by thanhtunguet — built to save your admin hours 🎯
