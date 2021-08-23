const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/404', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.not_found, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/404', req, 'ratelimit');
      }

      return res.status(429).send({
        message: 'Too many requests'
      });
    }
  }

  return res.status(404).send({
    message: 'Not found'
  });
};
