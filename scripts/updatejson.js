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
    data[folder].push({
      name: item.replace('.json', ''),
      display_name: file.name,
      icon_url: file.icon_url,
      author: file.author
    });
  });
});

fs.writeFileSync('./data/all.json', JSON.stringify(data));

const collections = [];
fs.readdirSync('./data/collections').forEach((item) => { 
  const file = JSON.parse(fs.readFileSync(`./data/collections/${item}`, 'utf8'));
  collections.push({
    name: item.replace('.json', ''),
    display_name: file.name,
    img: file.img,
    description: file.description
  });
});

fs.writeFileSync('./data/collections.json', JSON.stringify(collections));
