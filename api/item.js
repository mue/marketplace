const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request(`/${req.query.category}/${req.query.item}`, req);
  }

  if (config.ratelimit.enabled) { 
    try {
      await rateLimit(config.ratelimit.limits.item, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error(`/${req.query.category}/${req.query.item}`, req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    updated: 'unknown',
    data: require(`../data/${req.query.category}/${req.query.item}`)
  });
};
