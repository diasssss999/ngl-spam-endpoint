// api/ngspam.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class NgspamAbiq {
    constructor(username, message, max_attempts = 100, delay = 1) {
        this.username = username;
        this.message = message;
        this.max_attempts = max_attempts;
        this.delay = delay;
        this.counter = 0;
        this.results = {
            successful_attempts: 0,
            rate_limited_attempts: 0,
            failed_attempts: 0
        };
    }

    generateDeviceId() {
        return crypto.createHash('md5').update(uuidv4()).digest('hex').substring(0, 42);
    }

    getFormattedTime() {
        return new Date().toLocaleTimeString();
    }

    async sendSingleMessage(attempt_number) {
        try {
            const formatted_time = this.getFormattedTime();
            const device_id = this.generateDeviceId();

            const url = "https://ngl.link/api/submit";

            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Referer": `https://ngl.link/${this.username}`,
                "Origin": "https://ngl.link"
            };

            const post_data = new URLSearchParams({
                'username': this.username,
                'question': this.message,
                'deviceId': device_id,
                'gameSlug': '',
                'referrer': ''
            }).toString();

            console.log(`[${formatted_time}] [Attempt ${attempt_number}] Mengirim request...`);

            const response = await axios.post(url, post_data, {
                headers: headers,
                timeout: 10000,
                validateStatus: false
            });

            if (response.status !== 200) {
                console.log(`[${formatted_time}] [Error] Rate limited - Status: ${response.status}`);
                return { success: false, reason: "rate_limited" };
            } else {
                this.counter++;
                this.results.successful_attempts++;
                console.log(`[${formatted_time}] [Success] Pesan terkirim: ${this.counter}`);
                return { success: true, reason: "success" };
            }

        } catch (error) {
            const formatted_time = this.getFormattedTime();
            console.log(`[${formatted_time}] [Error] Request gagal: ${error.message}`);
            this.results.failed_attempts++;
            return { success: false, reason: error.message };
        }
    }

    async runEducationalTest() {
        console.log(`=== NGSPAM ABIQ API VERSION ===`);
        console.log(`Target: ${this.username}`);
        console.log(`Pesan: ${this.message}`);
        console.log(`Max Attempts: ${this.max_attempts}`);
        console.log(`Delay: ${this.delay} seconds`);
        console.log(`================================`);

        for (let attempt = 1; attempt <= this.max_attempts; attempt++) {
            const result = await this.sendSingleMessage(attempt);

            if (result.reason === "rate_limited") {
                this.results.rate_limited_attempts++;
                console.log(`[Info] Menunggu 25 detik karena rate limit...`);
                await new Promise(resolve => setTimeout(resolve, 25000));
                continue;
            }

            if (attempt < this.max_attempts) {
                await new Promise(resolve => setTimeout(resolve, this.delay * 1000));
            }
        }

        const success_rate = this.max_attempts > 0 ? 
            (this.results.successful_attempts / this.max_attempts) * 100 : 0;

        const finalResults = {
            target: this.username,
            message: this.message,
            successful_attempts: this.results.successful_attempts,
            rate_limited_attempts: this.results.rate_limited_attempts,
            failed_attempts: this.results.failed_attempts,
            total_attempts: this.max_attempts,
            success_rate: success_rate.toFixed(2),
            timestamp: new Date().toISOString()
        };

        console.log(`=== HASIL SPAMING ===`);
        console.log(JSON.stringify(finalResults, null, 2));

        return finalResults;
    }
}

// API Handler untuk Vercel
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
        });
    }

    try {
        const { username, message, max_attempts = 10, delay = 2 } = req.body;

        // Validation
        if (!username || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Username and message are required'
            });
        }

        if (max_attempts > 50) {
            return res.status(400).json({
                error: 'Too many attempts',
                message: 'Maximum attempts limited to 50 for API safety'
            });
        }

        // Create spam instance and run
        const spamBot = new NgspamAbiq(username, message, max_attempts, delay);
        const results = await spamBot.runEducationalTest();

        // Add API info
        results.api_info = {
            version: "1.0",
            developer: "Abiq Nurmagedov",
            github: "https://github.com/abiqq",
            support: "https://saweria.co/abiqq57"
        };

        res.status(200).json({
            status: 'success',
            data: results
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error',
            message: error.message
        });
    }
};
