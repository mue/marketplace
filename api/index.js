module.exports = (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send({
        message: 'hello world'
    });
}