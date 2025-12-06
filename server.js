require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());
app.use(cors()); // সব ডোমেইন থেকে রিকোয়েস্ট এলাউ করা হলো

// Gemini API সেটআপ
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// সার্ভার ঠিক আছে কিনা দেখার জন্য রুট
app.get('/', (req, res) => {
    res.send('AI Server is Running! 🚀');
});

// চ্যাট করার API
app.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
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

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));