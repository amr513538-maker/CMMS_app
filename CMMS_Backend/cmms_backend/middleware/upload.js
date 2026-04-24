const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, ''));
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
