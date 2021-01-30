const fs = require('fs');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { category, name } = req.params;
    let data, failed;

    try {
        data = {
            updated: dtf('n_D MMM YYYY', fs.statSync(`../data/${category}/${name}.json`).mtime, 'en-GB'),
            data: JSON.parse(fs.readFileSync(`../data/${category}/${name}.json`, 'utf8'))
        }
    } catch (e) {
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