const fs = require('fs');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    let data = {
      //  'settings': [],
        'photo_packs': [],
      //  'quote_packs': [],
      //  'themes': []
    };

    Object.keys(data).forEach((folder) => {
        fs.readdirSync(`./data/${folder}`).forEach((item) => {
            let file = JSON.parse(fs.readFileSync(`./data/${folder}/${item}`, 'utf8'));
            data[folder].push({
                name: item.replace('.json', ''),
                display_name: file.name,
                icon_url: file.icon_url,
                author: file.author
            });
        });
    });

    return res.status(200).send({
        data: data
    });
}