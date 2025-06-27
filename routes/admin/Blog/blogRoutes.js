const express = require('express');
const { body, validationResult } = require('express-validator');
const blogController = require('../../../controllers/admin/Blog/blog.Controller');
const router = express.Router();
const authenticate = require('../../../middlewares/authenticate');
const isAdmin = require('../../../middlewares/isAdmin');

router.use(authenticate, isAdmin);

const blogValidationRules = [
  body('title').notEmpty().withMessage('Title is required'),
  body('coverImage')
    .notEmpty()
    .withMessage('Cover image is required')
    .isURL()
    .withMessage('Cover image must be a valid URL'),
  body('content').notEmpty().withMessage('Content is required'),
  body('categories')
    .isArray()
    .withMessage('Categories should be an array')
    .optional(),
];

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/', blogValidationRules, validateRequest, blogController.createBlog);
router.get('/', blogController.getAllBlogs);
router.get('/:slug', blogController.getBlogBySlug);
router.put('/:slug', blogValidationRules, validateRequest, blogController.updateBlog);
router.delete('/:slug', blogController.deleteBlog);

router.put('/:slug/feature', blogController.toggleFeature);

// Publish toggle route
router.put('/:slug/publish', blogController.togglePublish);

module.exports = router;
