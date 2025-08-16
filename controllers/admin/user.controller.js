const User = require("../../models/User");

// GET /admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const [users, totalVendor, totalCustomer, otpVerified, otpUnverified] =
      await Promise.all([
        User.find({ isDeleted: false }).select("-passwordHash"),
        User.countDocuments({ isDeleted: false, role: "business_owner" }),
        User.countDocuments({ isDeleted: false, role: "customer" }),
        User.countDocuments({ isDeleted: false, isOtpVerified: true }),
        User.countDocuments({ isDeleted: false, isOtpVerified: false }),
      ]);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      totalVendor,
      totalCustomer,
      otpVerified,
      otpUnverified,
    });
  } catch (error) {
    console.error("getAllUsers error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /admin/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).select("-passwordHash");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User details fetched",
      data: user,
    });
  } catch (error) {
    console.error("getUserById error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /admin/users/:id
exports.updateUserByAdmin = async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found or deleted" });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("updateUserByAdmin error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /admin/users/:id
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User soft deleted successfully",
    });
  } catch (error) {
    console.error("deleteUserByAdmin error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /admin/users/:id/block
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User has been ${user.isBlocked ? "blocked" : "unblocked"}`,
    });
  } catch (error) {
    console.error("toggleBlockUser error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
