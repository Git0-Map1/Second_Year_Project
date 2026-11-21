
const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  const documentTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ];

  if (file.fieldname === "images") {
    if (imageTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      new Error("Property images must be JPEG, PNG or WEBP"),
      false
    );
  }

  if (file.fieldname === "lalpurja") {
    if (documentTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      new Error("Lalpurja must be JPEG, PNG, WEBP or PDF"),
      false
    );
  }

  cb(new Error("Unexpected file field"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 11
  }
});

module.exports = { upload };
