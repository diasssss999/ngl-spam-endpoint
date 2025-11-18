const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { username, message, max_attempts = 5, delay = 2 } = req.body;

    // Validation
    if (!username || !message) {
      return res.status(400).json({
        error: 'Username and message are required'
      });
    }

    if (max_attempts > 20) {
      return res.status(400).json({
        error: 'Max attempts cannot exceed 20'
      });
    }

    // Results tracking
    let successful = 0;
    let failed = 0;

    // Send messages
    for (let i = 1; i <= max_attempts; i++) {
      try {
        const deviceId = Math.random().toString(36).substring(2, 15);
        
        const response = await axios.post('https://ngl.link/api/submit', 
          `username=${username}&question=${message}&deviceId=${deviceId}&gameSlug=&referrer=`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': `https://ngl.link/${username}`,
              'Origin': 'https://ngl.link'
            },
            timeout: 10000
          }
        );

        if (response.status === 200) {
          successful++;
          console.log(`Attempt ${i}: Success`);
        } else {
          failed++;
          console.log(`Attempt ${i}: Failed - Status ${response.status}`);
        }
      } catch (error) {
        failed++;
        console.log(`Attempt ${i}: Error - ${error.message}`);
      }

      // Delay between requests
      if (i < max_attempts) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }

    // Success response
    res.status(200).json({
      status: 'completed',
      target: username,
      message: message,
      results: {
        successful,
        failed,
        total: max_attempts,
        success_rate: ((successful / max_attempts) * 100).toFixed(2) + '%'
      },
      developer: 'Abiq Nurmagedov',
      github: 'https://github.com/abiqq',
      support: 'https://saweria.co/abiqq57'
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
