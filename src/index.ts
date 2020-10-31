import { fastify, FastifyInstance } from 'fastify';
import fs from 'fs';
import config from './config.json';
import dtf from '@eartharoid/dtf';
import Logger from 'leekslazylogger-fastify';

const log = new Logger({
    name: config.logname
});
const server: FastifyInstance = fastify();

server.register(log.fastify); // logger
server.register(require('fastify-cors'));
server.register(require('fastify-rate-limit'), {
    max: config.ratelimit.max,
    timeWindow: config.ratelimit.timewin
});

server.get('/', async () => {
    return {
        message: 'Hello World'
    }
});

interface ItemParams {
    category: string;
    name: string;
}

server.get<{Params: ItemParams}>('/item/:category/:name', async (req) => {
    const { category, name } = req.params;

    try {
        return {
            updated: dtf('n_D MMM YYYY', fs.statSync(`../data/${category}/${name}.json`).mtime, 'en-GB'),
            data: JSON.parse(fs.readFileSync(`../data/${category}/${name}.json`, 'utf8'))
        }
    } catch (e) {
        return {
            error: '404 not found'
        }
    }
});

server.get('/all', async () => {
    let data = {
        'settings': [],
        'photo_packs': [],
        'quote_packs': [],
        'themes': []
    };

    Object.keys(data).forEach((folder) => {
        if (!fs.existsSync(`../data/${folder}`)) fs.mkdirSync(`../data/${folder}`);
        fs.readdirSync(`../data/${folder}`).forEach((item: string) => {
            let file = JSON.parse(fs.readFileSync(`../data/${folder}/${item}`, 'utf8'));
            data[folder].push({
                name: item.replace('.json', ''),
                display_name: file.name,
                icon_url: file.icon_url,
                author: file.author
            });
        });
    });

    return {
        data: data
    }
});

server.get('/featured', async () => {
    return {
        data: JSON.parse(fs.readFileSync('../data/featured.json', 'utf8'))
    }
});

server.listen(config.port, () => log.info(`Server started on port ${config.port}`));