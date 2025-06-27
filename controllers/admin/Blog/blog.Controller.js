const Blog = require('../../../models/Blog');
const { validationResult } = require('express-validator');
const deleteCloudinaryFile = require('../../../utils/deleteCloudinaryFile'); // Import the utilitys


const extractImageUrls = (content) => {
  try {
    // Regex to match Cloudinary image URLs (only .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp)
    const regex = /https:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/([^"']+\.(?:jpg|jpeg|png|gif|bmp|svg|webp))/g;
    const matches = [];
    let match;

    // Look for all matches using the regex
    while ((match = regex.exec(content)) !== null) {
      // Only push valid matches
      if (match[0]) {
        matches.push(match[0]);
      }
    }

    return matches;
  } catch (error) {
    // Log the error and return an empty array to avoid breaking the application
    console.error("Error extracting image URLs:", error.message);
    return [];
  }
};





exports.createBlog = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { title, coverImage, content, author, categories, isPublished } = req.body;

  try {
    
    const newBlog = new Blog({
      title,
      coverImage,
      content,
      author,
      categories,
      isPublished: isPublished || false,
    });

    await newBlog.save();
    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: newBlog,
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Could not create blog.',
    });
  }
};

exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    if (blogs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No blogs found',
      });
    }
    return res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Could not fetch blogs.',
    });
  }
};

exports.getBlogBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Could not fetch blog.',
    });
  }
};

// Update Blog
exports.updateBlog = async (req, res) => {
  const { slug } = req.params;
  const { title, coverImage, content, author, categories, isPublished } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    if (coverImage && coverImage !== blog.coverImage) {
      // If the cover image is updated, delete the old one from Cloudinary
      await deleteCloudinaryFile(blog.coverImage);
    }

    // Extract inline images from the content and delete old ones from Cloudinary
    const oldImages = extractImageUrls(blog.content);
    const newImages = extractImageUrls(content);

    // Delete old images that are no longer in the content
    for (let oldImage of oldImages) {
      if (!newImages.includes(oldImage)) {
        await deleteCloudinaryFile(oldImage);
      }
    }

    // Update blog fields
    blog.title = title || blog.title;
    blog.coverImage = coverImage || blog.coverImage;
    blog.content = content || blog.content;
    blog.author = author || blog.author;
    blog.categories = categories || blog.categories;
    blog.isPublished = isPublished !== undefined ? isPublished : blog.isPublished;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Could not update blog.',
    });
  }
};

// Delete Blog
exports.deleteBlog = async (req, res) => {
  const { slug } = req.params;

  try {
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Delete cover image from Cloudinary
    if (blog.coverImage) {
      await deleteCloudinaryFile(blog.coverImage);
    }

    // Extract inline images from the content and delete them from Cloudinary
    const inlineImages = extractImageUrls(blog.content);
    for (let image of inlineImages) {
      await deleteCloudinaryFile(image);
    }

    // Permanently delete the blog
    await Blog.deleteOne({ slug });

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Could not delete blog.',
    });
  }
};



exports.toggleFeature = async (req, res) => {
  const { slug } = req.params;

  try {
    const blog = await Blog.findOne({ slug });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (!blog.isPublished) {
      return res.status(400).json({ success: false, message: 'Only published blogs can be featured' });
    }

    blog.featured = !blog.featured;
    await blog.save();

    return res.status(200).json({
      success: true,
      message: `Blog ${blog.featured ? 'featured' : 'unfeatured'} successfully`,
      data: blog,
    });
  } catch (error) {
    console.error('Error toggling feature status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling feature status.',
    });
  }
};

exports.togglePublish = async (req, res) => {
  const { slug } = req.params;

  try {
    const blog = await Blog.findOne({ slug });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const wasPublished = blog.isPublished;

    blog.isPublished = !blog.isPublished;

    if (!blog.isPublished) {
      // If the blog is being unpublished, unfeature it as well
      blog.featured = false;
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully${
        wasPublished && !blog.isPublished ? ', and unfeatured' : ''
      }`,
      data: blog,
    });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling publish status.',
    });
  }
};

