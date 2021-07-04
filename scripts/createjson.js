const fs = require('fs');
const path = require('path');

let data = {   
    preset_settings: [],
    photo_packs: [],
    quote_packs: []
};

Object.keys(data).forEach((folder) => {
    const categories = path.join(__dirname, '../data', folder);
    if (!fs.existsSync(categories)) {
        return;
    }

    fs.readdirSync(categories).forEach((item) => {
        const file = JSON.parse(fs.readFileSync(`../data/${folder}/${item}`, 'utf8'));
        data[folder].push({
            name: item.replace('.json', ''),
            display_name: file.name,
            icon_url: file.icon_url,
            author: file.author
        });
    });
});

fs.writeFileSync('../data/all.json', JSON.stringify(data));