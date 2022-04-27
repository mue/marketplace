const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request(`/collection/${req.query.collection}`, req);
  }

  if (config.ratelimit.enabled) { 
    try {
      await rateLimit(config.ratelimit.limits.item, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error(`/collection/${req.query.collection}`, req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  let data;
  try {
    data = require(`../data/collections/${req.query.collection}`);
  } catch (e) {
    return res.status(404).send({
      message: 'Collection not found'
    });
  }

  let items = [];
  const all = require('../data/all.json');
  try {
    data.items.forEach((item) => { 
      const data = all[item.split('/')[0]].find(i => i.name === item.split('/')[1]);
      items.push({
        name: data.name,
        display_name: data.display_name,
        icon_url: data.icon_url,
        author: data.author,
        type: item.split('/')[0]
      });
    });
  } catch (e) {
    return res.status(404).send({
      message: 'Collection not found'
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    data: {
      name: data.name,
      img: data.img,
      description: data.description,
      items: items
    }
  });
};
