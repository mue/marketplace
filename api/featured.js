const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/featured', req);
  }

  if (config.ratelimit.enabled) { 
    try {
      await rateLimit(config.ratelimit.limits.featured, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/featured', req, 'ratelimit');
      }
      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    data: require('../data/featured.json')
  });
};
