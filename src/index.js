const fastify = require('fastify')();
const fs = require('fs');
const config = require('./config.json');
const dtf = require('@eartharoid/dtf');
const Logger = require('leekslazylogger');
const log = new Logger({
    name: config.logname
});

fastify.register(require('fastify-cors'));
fastify.register(require('fastify-rate-limit'), {
    max: config.ratelimit.max,
    timeWindow: config.ratelimit.timewin
});

fastify.get('/', async () => {
    return {
        message: 'Hello World'
    }
});

fastify.get('/item/:category/:name', async (req) => {
    log.info(`Request made to /item/${req.params.category}/${req.params.name}`);

    try {
        return {
            updated: dtf('n_D MMM YYYY', fs.statSync(`../data/${req.params.category}/${req.params.name}.json`).mtime, 'en-GB'),
            data: JSON.parse(fs.readFileSync(`../data/${req.params.category}/${req.params.name}.json`))
        }
    } catch (e) {
        return {
            error: '404 not found'
        }
    }
});

fastify.get('/all', async () => {
    log.info('Request made to /all');

    let data = {
        'settings': [],
        'photo_packs': [],
        'quote_packs': [],
        'themes': []
    };

    Object.keys(data).forEach((folder) => {
        if (!fs.existsSync(`../data/${folder}`)) fs.mkdirSync(`./data/${folder}`);
        fs.readdirSync(`../data/${folder}`).forEach((item) => {
            let file = JSON.parse(fs.readFileSync(`../data/${folder}/${item}`));
            data[folder].push({
                name: item.replace('.json', ''),
                display_name: file.name,
                icon_url: file.icon_url,
                description: file.description,
                author: file.author
            });
        });
    });

    return {
        data: data
    }
});

fastify.get('/featured', async () => {
    log.info('Request made to /featured');
    return {
        data: JSON.parse(fs.readFileSync('../data/featured.json'))
    }
});

fastify.listen(config.port, log.info('Server started'));
