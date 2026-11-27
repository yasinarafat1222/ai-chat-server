# AI Chat Server — Desktop App 🚀

Gemini API-ভিত্তিক চ্যাট সার্ভার + **Windows ডেস্কটপ অ্যাপ** (Electron)।

- ব্যাকএন্ড: Express + `@google/generative-ai` (`server.js`)
- ডেস্কটপ অ্যাপ: Electron (`electron/main.js`) — একই প্রসেসে সার্ভার চালিয়ে চ্যাট UI দেখায়
- চ্যাট UI: `public/` (ভ্যানিলা HTML/CSS/JS)
- ইনস্টলার: NSIS → `release/setup.exe`

## লোকালি চালানো

```bash
npm install
npm start        # শুধু সার্ভার (http://localhost:3000)
npm run desktop  # ডেস্কটপ অ্যাপ (Electron)
```

## Windows ইনস্টলার বিল্ড

```bash
npm install
npm run dist     # Windows-এ চালালে release/setup.exe তৈরি হবে
```

- Linux/macOS থেকে Windows ইনস্টলার বিল্ড করতে GitHub Actions ব্যবহার করা হয়:
  `.github/workflows/build-setup.yml` (manual dispatch) — বিল্ড শেষে `setup.exe`
  এই ব্রাঞ্চের `release/` ফোল্ডারে commit করা হয়।

## Gemini API Key সেট করা

৩টি উপায়ের যেকোনো একটি:

1. **ডেস্কটপ অ্যাপে**: ⚙️ সেটিংসে কী দিন (localStorage-এ থাকে, প্রতি রিকোয়েস্টে পাঠানো হয়)।
2. **এনভায়রনমেন্ট ভ্যারিয়েবল**: `GEMINI_API_KEY`।
3. **.env ফাইল**: প্রজেক্ট ফোল্ডারে অথবা Windows-এ `%APPDATA%\ai-chat-server\.env`:
   ```
   GEMINI_API_KEY=আপনার-কী
   ```

কী পাবেন: <https://aistudio.google.com/apikey>

মডেল বদলাতে: `GEMINI_MODEL` এনভায়রনমেন্ট ভ্যারিয়েবল (ডিফল্ট: `gemini-2.0-flash`)।

## API

| Method | Path    | Body                                                                                       |
| ------ | ------- | ------------------------------------------------------------------------------------------ |
| POST   | `/chat` | `{ "message": "hi", "apiKey": "AIza...", "context": { "systemPrompt": "", "knowledge": "" } }` |

`apiKey` বা `context` ঐচ্ছিক। `apiKey` না দিলে সার্ভারের কনফিগার করা key ব্যবহার হয়।
