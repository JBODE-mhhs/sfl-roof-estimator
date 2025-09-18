require('dotenv').config({ path: './.env' }); console.log('GHL_API_KEY:', process.env.GHL_API_KEY); console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('GHL'))); 
