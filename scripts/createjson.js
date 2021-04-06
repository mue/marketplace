const fs = require('fs');
const path = require('path');

let data = {
    'settings': [],
    'photo_packs': [],
    'quote_packs': [],
    'themes': []
};

Object.keys(data).forEach((folder) => {
    if (!fs.existsSync(path.join(__dirname, '../data', folder))) return;
    fs.readdirSync(path.join(__dirname, '../data', folder)).forEach((item) => {
        let file = JSON.parse(fs.readFileSync(`../data/${folder}/${item}`, 'utf8'));
        data[folder].push({
            name: item.replace('.json', ''),
            display_name: file.name,
            icon_url: file.icon_url,
            author: file.author
        });
    });
});

fs.writeFileSync('../data/all.json', JSON.stringify(data));