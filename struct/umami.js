const fetch = require('node-fetch');
const parser = require('ua-parser-js');

const config = require('../config.json');

module.exports = class Umami {
  static getReferrer(req) {
    const referrer = req.headers['referer'] || req.headers['referrer'] || req.headers['origin'];
    const ua = new parser(req.headers['user-agent']);

    if (referrer) {
      if (referrer.startsWith('moz-extension://')) {
        return 'https://firefox.muetab.com';
      } else if (referrer === config.chrome_extension || referrer === config.edge_extension || referrer === config.whale_extension) {
        switch (ua.getBrowser().name) {
          case 'Chrome':
            return 'https://chrome.muetab.com';
          case 'Edge':
            if (referrer === config.chrome_extension) {
              return 'https://chromeonedge.muetab.com';
            }
            return 'https://edge.muetab.com';
          case 'Whale':
            if (referrer === config.chrome_extension) {
              return 'https://chromeonwhale.muetab.com';
            }
            return 'https://whale.muetab.com';
          default:
            return 'https://chromium.muetab.com';
        }
      } else {
        return referrer;
      }
    }
  }

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
          language: req.headers['accept-language'] ? req.headers['accept-language'].split(',')[0] : '',
          screen: '1920x1080',
          referrer: this.getReferrer(req)
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
          event_value: error,
          referrer: this.getReferrer(req)
        }
      })
    });
  }
};
