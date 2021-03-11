const fs = require('fs');
const dtf = require('@eartharoid/dtf');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { category, item } = req.query;
    let data, failed;

    try {
        data = {
            updated: dtf('n_D MMM YYYY', fs.statSync(`./data/${category}/${item}.json`).mtime, 'en-GB'),
            data: JSON.parse(fs.readFileSync(`./data/${category}/${item}.json`, 'utf8'))
        }
    } catch (e) {
        console.log(e)
        data = {
            error: '404 not found'
        }
        failed = true;
    }

    if (failed === true) {
        return res.status(404).send({
            data: data
        });
    }

    return res.status(200).send({
        data: data
    });
}