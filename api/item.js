module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send({
        updated: 'unknown',
        data: require(`../data/${req.query.category}/${req.query.item}`)
    });
}