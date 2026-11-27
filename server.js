require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ইনস্টল করা ডেস্কটপ অ্যাপের জন্য: %APPDATA%/ai-chat-server/.env থেকেও key পড়া হয়
const appDataEnv = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'ai-chat-server', '.env')
    : null;
if (appDataEnv && fs.existsSync(appDataEnv)) {
    require('dotenv').config({ path: appDataEnv, override: false });
}

const app = express();
app.use(express.json());
app.use(cors()); // সব ডোমেইন থেকে রিকোয়েস্ট এলাউ করা হলো

// চ্যাট UI (public ফোল্ডার) সার্ভ করা
app.use(express.static(path.join(__dirname, 'public')));

// চ্যাট করার API
app.post('/chat', async (req, res) => {
    try {
        const { message, context, apiKey } = req.body;

        // API Key: রিকোয়েস্ট বডি থেকে (ডেস্কটপ অ্যাপ) অথবা এনভায়রনমেন্ট ভ্যারিয়েবল থেকে
        const key = (apiKey && String(apiKey).trim()) || process.env.GEMINI_API_KEY;
        if (!key) {
            return res.status(400).json({
                error: 'Gemini API Key সেট করা হয়নি। উপরের ⚙️ সেটিংসে কী দিন, অথবা GEMINI_API_KEY এনভায়রনমেন্ট ভ্যারিয়েবল সেট করুন।'
            });
        }

        // প্রতি রিকোয়েস্টে দেওয়া key দিয়ে Gemini ক্লায়েন্ট তৈরি
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
        });

        // AI এর রোল এবং প্রম্পট রেডি করা
        const prompt = `System: ${context?.systemPrompt || 'You are a helpful assistant.'}
        Info: ${context?.knowledge || 'No specific knowledge base.'}
        User: ${message}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        res.json({ reply: response });

    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: "Server Error: Could not get response from AI." });
    }
});

// সার্ভার ঠিক আছে কিনা দেখার জন্য রুট (UI থাকলে index.html আগে সার্ভ হয়)
app.get('/', (req, res) => {
    res.send('AI Server is Running! 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
