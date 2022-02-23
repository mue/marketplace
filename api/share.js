const eta = require('eta');
const path = require('path');

eta.configure({
  views: path.join(__dirname, '../public')
});

module.exports = async (req, res) => {
  if (!req.query.item) {
    return res.status(400).send({
      message: 'Item not specified'
    });
  }

  const data = require('../data/all.json');
  const array = [];
  Object.keys(data).forEach((key) => {
    Object.keys(data[key]).forEach((item) => {
      const marketplaceItem = data[key][item];
      marketplaceItem.type = key;
      array.push(marketplaceItem);
    });
  });

  let item;
  const itemData = array.find(item => item.name === Buffer.from(req.query.item, 'base64').toString('ascii'));
  if (itemData !== undefined) { 
    item = require(`../data/${itemData.type}/${itemData.name}.json`);
  } else {
    return res.status(404).send({
      message: 'Not Found'
    });
  }

  return res.status(200).send(await eta.renderFile('share.html', {
    name: item.name,
    description: item.description,
    type: item.type,
    version: item.version,
    author: item.author,
    icon_url: item.icon_url,
    screenshot_url: item.screenshot_url
  }));
};
