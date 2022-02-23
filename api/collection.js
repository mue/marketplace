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
      items.push(all[item.split('/')[0]].find(i => i.name === item.split('/')[1]));
    });
  } catch (e) {
    return res.status(404).send({
      message: 'Collection not found'
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    data: {
      title: data.title,
      img: data.img,
      description: data.description,
      items: items
    }
  });
};
