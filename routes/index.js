import express from 'express';
import userController from '../controllers/userController.js';
import placeController from '../controllers/placeController.js';
import bookingController from '../controllers/bookingController.js';
import { Place } from '../models/Place.js';
import imageDownload from 'image-downloader';
import multer from 'multer';
import mime from 'mime-types';
import cloudinary from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

const router = express.Router();

// Configure Cloudinary with your credentials
cloudinary.v2.config({
    cloud_name: 'dd12ribpp',
    api_key: '545192252345335',
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

router.use('/user', userController);
router.use('/place', placeController);
router.use('/booking', bookingController);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route to get all places for index page
router.get('/places', async (req, res) => {
  try {
    const allPlaces = await Place.find();
    res.json(allPlaces);
  } catch (err) {
    res.json(err.message);
  }
});

router.post('/upload', upload.array('photos', 50), async (req, res) => {
  try {
    const uploadedFiles = [];
    for (const file of req.files) {
      const result = await cloudinary.v2.uploader.upload(file.path);
      uploadedFiles.push(result.secure_url);
      await unlinkAsync(file.path); // Remove the file from local storage after upload
    }
    res.json(uploadedFiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload_by_link', async (req, res) => {
  try {
    const { imgLink } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    const downloadPath = '/tmp/' + newName;

    await imageDownload.image({
      url: imgLink,
      dest: downloadPath,
    });

    // Upload the image to Cloudinary
    const result = await cloudinary.v2.uploader.upload(downloadPath);

    // Respond with the Cloudinary URL
    res.json({ url: result.secure_url });

    // Remove the downloaded file from local storage
    await unlinkAsync(downloadPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
