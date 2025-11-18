// routes/documents.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Resident = require('../models/Resident');
const { bucket } = require('../firebaseConfig');
const multer = require('multer');

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!file) {
      return cb(new Error('No file provided'), false);
    }
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }
});

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/documents/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Documents route hit:', {
    method: req.method,
    url: req.url,
    body: req.body,
    file: req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file'
  });

  try {
    const { residentId, name, type } = req.body;

    // Validate inputs
    if (!residentId) {
      return res.status(400).json({ success: false, message: 'Missing residentId' });
    }
    if (!isValidObjectId(residentId)) {
      return res.status(400).json({ success: false, message: `Invalid residentId: ${residentId}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'Document name is required' });
    }
    if (!type) {
      return res.status(400).json({ success: false, message: 'Document type is required' });
    }

    // Validate document type
    const validTypes = ['medical', 'police_verification', 'identity_proof', 'address_proof', 'court_documents', 'certificates', 'legal_documents', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid document type: ${type}` });
    }

    // Check if resident exists
    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({ success: false, message: `Resident not found for ID: ${residentId}` });
    }

    // Upload to Firebase
    console.log('Uploading to Firebase:', { fileName: req.file.originalname });
    const fileName = `documents/${residentId}/${Date.now()}_${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
    const [downloadUrl] = await fileUpload.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    console.log('File uploaded to Firebase:', { downloadUrl });

    // Save to MongoDB
    console.log('Attempting to save document to MongoDB:', { residentId, name, type, filePath: downloadUrl });
    const document = new Document({
      residentId,
      name,
      type,
      filePath: downloadUrl,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    });
    const savedDocument = await document.save();
    console.log('Document saved to MongoDB:', savedDocument._id);

    // Update resident
    resident.documentIds = resident.documentIds || [];
    resident.documentIds.push(savedDocument._id);
    await resident.save();
    console.log('Resident updated with document ID:', savedDocument._id);

    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: savedDocument });
  } catch (error) {
    console.error('Error in /api/documents/upload:', {
      message: error.message,
      stack: error.stack,
      residentId: req.body.residentId,
      file: req.file ? req.file.originalname : 'No file'
    });
    res.status(500).json({ success: false, message: `Error uploading document: ${error.message}` });
  }
});

module.exports = router;