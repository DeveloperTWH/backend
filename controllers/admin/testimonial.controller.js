// controllers/admin/testimonial.controller.js

const Testimonial = require('../../models/Testimonial');
const deleteCloudinaryFile = require('../../utils/deleteCloudinaryFile');


// GET all testimonials
exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: testimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
  }
};

// CREATE a new testimonial
exports.createTestimonial = async (req, res) => {
  try {
    const { name, role, content, image, rating, isFeatured } = req.body;

    const testimonial = new Testimonial({
      name,
      role,
      content,
      image,
      rating,
      isFeatured,
    });

    await testimonial.save();

    res.status(201).json({ success: true, data: testimonial });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to create testimonial',err:err });
  }
};

// UPDATE testimonial by ID
exports.updateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    res.status(200).json({ success: true, data: testimonial });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to update testimonial' });
  }
};

// DELETE testimonial by ID
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    // Delete Cloudinary image
    await deleteCloudinaryFile(testimonial.image);

    // Delete testimonial from DB
    await testimonial.deleteOne();

    res.status(200).json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete testimonial' });
  }
};
