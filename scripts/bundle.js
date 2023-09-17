const fs = require('fs');

const data = {   
  preset_settings: [],
  photo_packs: [],
  quote_packs: []
};

Object.keys(data).forEach((folder) => {
  const categories = `./data/${folder}`;
  if (!fs.existsSync(categories)) {
    return;
  }

  fs.readdirSync(categories).forEach((item) => {
    const file = JSON.parse(fs.readFileSync(`./data/${folder}/${item}`, 'utf8'));

    if (file.draft === true) {
      return;
    }

    data[folder].push({
      display_name: file.name,
      ...file,
      name: item.replace('.json', ''),
    });
  });
});


const collections = [];
fs.readdirSync('./data/collections').forEach((item) => { 
  const file = JSON.parse(fs.readFileSync(`./data/collections/${item}`, 'utf8'));

  if (file.draft === true) {
    return;
  }

  const collectionObject = {
    name: item.replace('.json', ''),
    display_name: file.name,
    img: file.img,
    description: file.description,
    news: file.news || false,
    items: file.items || null,
  }

  // news "collections" have no items
  collectionObject.items?.forEach((item) => {
    const [type, name] = item.split('/');
    const resolved = data[type].find(i => i.name === name);
    if (!resolved) {
      console.error('Item "%s" in the "%s" collection does not exist', item, collectionObject.name);
      process.exit(1);
    }
  });

  if (file.news) {
    collectionObject.news_link = file.news_link;
  }

  collections.push(collectionObject);
});

if (!fs.existsSync('./build')) {
  fs.mkdirSync('./build');
}

const index = {
  collections: collections.reduce((acc, itm, ix) => (acc[itm.name] = ix, acc), {}),
  preset_settings: data.preset_settings.reduce((acc, itm, ix) => (acc[itm.name] = ix, acc), {}),
  photo_packs: data.photo_packs.reduce((acc, itm, ix) => (acc[itm.name] = ix, acc), {}),
  quote_packs: data.quote_packs.reduce((acc, itm, ix) => (acc[itm.name] = ix, acc), {}),
};

fs.writeFileSync('./build/manifest.json', JSON.stringify({
  index,
  collections,
  ...data,
}));
