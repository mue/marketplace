const fs = require('fs');

const curators = {};

const data = {   
  preset_settings: {},
  photo_packs: {},
  quote_packs: {}
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

    const name = item.replace('.json', '');
    data[folder][name] = {
      name,
      display_name: file.name,
      icon_url: file.icon_url,
      author: file.author,
      language: file.language,
      in_collections: [],
    };

    if (!curators[file.author]) curators[file.author] = [];
    curators[file.author].push(folder + '/' + name);
  });
});


const collections = {};
fs.readdirSync('./data/collections').forEach((item) => { 
  const file = JSON.parse(fs.readFileSync(`./data/collections/${item}`, 'utf8'));

  if (file.draft === true) {
    return;
  }

  const collection = {
    name: item.replace('.json', ''),
    display_name: file.name,
    img: file.img,
    description: file.description,
    news: file.news || false,
    items: file.items || null,
  }

  // news "collections" have no items
  collection.items?.forEach((item) => {
    const [type, name] = item.split('/');
    if (!data[type][name]) {
      console.error('Item "%s" in the "%s" collection does not exist', item, collection.name);
      process.exit(1);
    }
    data[type][name].in_collections.push(collection.name);
  });

  if (file.news) {
    collection.news_link = file.news_link;
  }

  collections[collection.name] = collection;
});


fs.writeFileSync('./data/manifest.json', JSON.stringify({
  collections,
  curators,
  ...data,
}));
