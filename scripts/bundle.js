import fse from 'fs-extra';
import simpleGit from 'simple-git';
import sharp from 'sharp';
import { getAverageColor } from 'fast-average-color-node';

await fse.ensureDir('dist');
await fse.copy('data', 'dist');

let baseDir = '.';
if (process.env.CF_PAGES === '1') {
  await simpleGit().clone('https://github.com/mue/marketplace', 'build', { '--filter': 'tree:0' });
  baseDir = './build';
}
const git = simpleGit({ baseDir });

const curators = {};
const data = {
  preset_settings: {},
  photo_packs: {},
  quote_packs: {}
};

for (const folder of Object.keys(data)) {
  const categories = `./data/${folder}`;
  if (!fse.existsSync(categories)) {
    continue;
  }
  const items = fse.readdirSync(categories);
  for await (const item of items) {
    const path = `./data/${folder}/${item}`;
    const file = await fse.readJSON(path);

    if (file.draft === true) {
      continue;
    }

    const history = await git.log({
      file: path,
      maxCount: 1,
      strictDate: true,
    });

    const lastMod = new Date(history.latest.date).toISOString();
    file.updated_at = lastMod;

    try {
      const original = await (await fetch(file.icon_url))?.arrayBuffer();
      const saturated = await sharp(original)
        .modulate({
          saturation: 1.75
        }).
        toBuffer();
      // value, rgb, rgba, hex, hexa, isDark, isLight
      const colour = await getAverageColor(saturated, {
        ignoredColor: [0, 0, 0]
      });
      file.colour = colour.hex;
    } catch (e) {
      console.error('error reading %s', file.icon_url);
      console.error(e);
    }

    await fse.writeJSON(`./dist/${folder}/${item}`, file);

    const name = item.replace('.json', '');
    data[folder][name] = {
      name,
      display_name: file.name,
      icon_url: file.icon_url,
      colour: file.colour,
      author: file.author,
      language: file.language,
      in_collections: [],
    };

    if (!curators[file.author]) curators[file.author] = [];
    curators[file.author].push(folder + '/' + name);
  }
}


const collections = {};
for (const item of fse.readdirSync('./dist/collections')) {
  const file = await fse.readJSON(`./dist/collections/${item}`, 'utf8');

  if (file.draft === true) {
    continue;
  }

  const collection = {
    name: item.replace('.json', ''),
    display_name: file.name,
    img: file.img,
    description: file.description,
    news: file.news || false,
    items: file.items || null,
  };

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
}


await fse.writeJSON('./dist/manifest.json', {
  collections,
  curators,
  ...data,
});
