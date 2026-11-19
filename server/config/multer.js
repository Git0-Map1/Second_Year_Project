//multer is middleware used in Express to handle file uploads

const multer = require("multer");

//stored in server's memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) =>{
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if(allowedTypes.includes(file.mimetype)){
        cb(null, true)
    } else{
        cb(new Error("Only JPEG, PNG and WEBP images are allowed"), false);
    }
}

// configure multer
const upload = new multer({
    storage: storage,
    fileFilter: fileFilter,
    limits:{
        fileSize: 5 * 1024 * 1024, //5 MB per image
        files: 10 // maximum 10 images
    }
})

module.exports = {upload};
