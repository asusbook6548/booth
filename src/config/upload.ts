import multer from "multer";

// ========================================
// MEMORY STORAGE
// ========================================
//
// Railway (and most PaaS platforms) use an
// ephemeral filesystem — files written to
// disk are lost on restart / redeploy.
//
// Using memoryStorage keeps the uploaded
// file in RAM as req.file.buffer.
// The voter-import service reads from the
// buffer directly via XLSX.read().
//
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  // 50 mb upload limit
  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [
      ".xlsx",
      ".xls",
      ".csv",
    ];

    const extension =
      file.originalname
        .toLowerCase()
        .slice(
          file.originalname.lastIndexOf(".")
        );

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          "Only XLSX, XLS and CSV files are allowed"
        )
      );
    }

    cb(null, true);
  },
});