const rateLimit = require('lambda-rate-limiter')({
  interval: 60 * 1000
}).check;

module.exports = async (req, res) => {
  try {
    await rateLimit(30, req.headers['x-real-ip']);
  } catch (error) {
    return res.status(429).send({ 
      message: 'Too many requests' 
    });
  }

  return res.status(404).send({
    message: 'Not found'
  });
};
