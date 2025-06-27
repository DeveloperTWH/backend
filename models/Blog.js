const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    author: {
      type: String,
      required: true,
    },
    categories: [
      {
        type: String,
      },
    ],
    content: {
      type: String,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.pre('save', async function (next) {
    
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/[^\w-]+/g, '');   // Remove non-alphanumeric characters except hyphen

    const existingBlog = await Blog.findOne({ slug: this.slug });
    
    if (existingBlog) {
      this.slug = `${this.slug}-${Date.now()}`;  // Add timestamp to make slug unique
    }
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
