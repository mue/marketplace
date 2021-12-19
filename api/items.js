const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/items/' + req.query.category, req);
  }

  if (config.ratelimit.enabled) { 
    try {
      await rateLimit(config.ratelimit.limits.items, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/items/' + req.query.category, req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  if (req.query.category === 'all') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const data = require('../data/all.json');
    const array = [];
    Object.keys(data).forEach((key) => {
      Object.keys(data[key]).forEach((item) => {
        const marketplaceItem = data[key][item];
        marketplaceItem.type = key;
        array.push(marketplaceItem);
      });
    });

    return res.status(200).send({
      data: array
    });
  }

  const data = require('../data/all.json')[req.query.category];
  if (data === undefined) {
    return res.status(404).send({
      message: 'Category not found'
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    data: data
  });
};
