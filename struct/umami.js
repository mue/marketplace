const fetch = require('node-fetch');

module.exports = class Umami {
  static async request(url, req) {
    await fetch(process.env.UMAMI_URL + '/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent']
      },
      body: JSON.stringify({
        type: 'pageview',
        payload: {
          website: process.env.UMAMI_ID,
          url: url,
          language: '',
          screen: ''
        }
      })
    });
  }

  static async error(url, req, error) { 
    await fetch(process.env.UMAMI_URL + '/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent']
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: process.env.UMAMI_ID,
          url: url,
          event_type: 'error',
          event_value: error
        }
      })
    });
  }
};
