const parseRequestBody = (req, res, next) => { 

  try {
    if (typeof req.body.variantOptions === 'string') {
      req.body.variantOptions = JSON.parse(req.body.variantOptions);
    }

    if (typeof req.body.specifications === 'string') {
      req.body.specifications = JSON.parse(req.body.specifications);
    }

    if (typeof req.body.variants === 'string') {
      req.body.variants = JSON.parse(req.body.variants);
    }

     console.log('After parsing:', req.body);
    next();
  } catch (error) {
    console.error('Error during body parsing:', error);
    return res.status(400).json({ error: 'Invalid request body format.' });
  }
};

module.exports = parseRequestBody;
