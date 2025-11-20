const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Resident = require("../models/Resident");
const Document = require("../models/Document");
const { bucket } = require("../firebaseConfig"); // Firebase Storage bucket
const multer = require("multer");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Configure multer for memory storage (for Firebase uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images, PDF, DOC, DOCX files are allowed!"), false);
    }
  },
});

// Define isValidObjectId function
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// UPDATED: Enhanced multer configuration to handle multiple photo uploads
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for photos!"), false);
    }
  },
}).fields([
  { name: 'photoBeforeAdmission', maxCount: 1 },
  { name: 'photoAfterAdmission', maxCount: 1 },
  { name: 'photo', maxCount: 1 } // Keep for backward compatibility
]);

// UPDATED: Helper function to upload photo to Firebase
const uploadPhotoToFirebase = async (file, residentId, photoType) => {
  try {
    const fileName = `residents/${residentId}/${photoType}_${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    
    await fileUpload.save(file.buffer, {
      metadata: { 
        contentType: file.mimetype,
        metadata: {
          photoType: photoType,
          uploadedAt: new Date().toISOString()
        }
      },
    });
    
    const [downloadUrl] = await fileUpload.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });
    
    console.log(`${photoType} photo uploaded:`, { fileName, downloadUrl });
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading ${photoType} photo:`, error);
    throw error;
  }
};

// Middleware to parse JSON or FormData
const parseBody = (req, res, next) => {
  console.log("Parsing body:", {
    contentType: req.get("Content-Type"),
    body: req.body,
  });
  if (req.is("application/json")) {
    next();
  } else if (req.is("multipart/form-data")) {
    photoUpload(req, res, (err) => {
      if (err) {
        console.error("Photo upload error:", err);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }
      
      // Parse documentIds if present
      if (req.body.documentIds) {
        try {
          req.body.documentIds = JSON.parse(req.body.documentIds);
        } catch (err) {
          console.error("Error parsing documentIds:", err);
          return res.status(400).json({ 
            success: false, 
            message: "Invalid documentIds format" 
          });
        }
      }
      
      next();
    });
  } else {
    res.status(400).json({ 
      success: false, 
      message: "Unsupported Content-Type" 
    });
  }
};

// UPDATED POST /api/residents - Handle both photos properly
router.post("/", photoUpload, async (req, res) => {
  console.log("Create resident route hit:", {
    body: req.body,
    files: req.files ? Object.keys(req.files) : "No files uploaded",
  });

  try {
    const residentData = { ...req.body };
    const documentIds = req.body.documentIds
      ? JSON.parse(req.body.documentIds)
      : [];

    // Validate documentIds
    if (documentIds.length > 0) {
      for (const docId of documentIds) {
        if (!isValidObjectId(docId)) {
          console.log("Invalid document ID:", docId);
          return res.status(400).json({
            success: false,
            message: `Invalid document ID: ${docId}`,
          });
        }
      }
    }

    // Generate registration number if not provided
    if (!residentData.registrationNo) {
      residentData.registrationNo = await Resident.generateRegistrationNo();
      console.log("Generated registrationNo:", residentData.registrationNo);
    }

    // Create new resident first to get the ID for photo uploads
    const tempResident = new Resident({
      ...residentData,
      documentIds,
    });
    
    // Restructure address data
    if (
      residentData.state ||
      residentData.district ||
      residentData.country ||
      residentData.fullAddress
    ) {
      tempResident.address = {
        state: residentData.state,
        district: residentData.district,
        country: residentData.country || "India",
        fullAddress: residentData.fullAddress,
        city: residentData.city,
        pincode: residentData.pincode,
        latitude: residentData.latitude,
        longitude: residentData.longitude
      };
    }

    // Map form field names to schema field names
    const fieldMapping = {
      conveyanceNo: "conveyanceVehicleNo",
      pickPlace: "pickUpPlace",
      aadhaar: "aadhaarNumber",
    };
    Object.keys(fieldMapping).forEach((oldKey) => {
      if (residentData[oldKey] !== undefined) {
        tempResident[fieldMapping[oldKey]] = residentData[oldKey];
      }
    });

    // Save resident first to get the _id
    const savedResident = await tempResident.save();
    console.log("Resident created with ID:", savedResident._id);

    // UPDATED: Handle both photo uploads to Firebase
    let photoBeforeAdmissionUrl = null;
    let photoAfterAdmissionUrl = null;
    let legacyPhotoUrl = null;

    if (req.files) {
      // Handle photoBeforeAdmission
      if (req.files.photoBeforeAdmission && req.files.photoBeforeAdmission[0]) {
        try {
          photoBeforeAdmissionUrl = await uploadPhotoToFirebase(
            req.files.photoBeforeAdmission[0], 
            savedResident._id, 
            'before_admission'
          );
          savedResident.photoBeforeAdmission = photoBeforeAdmissionUrl;
        } catch (error) {
          console.error("Error uploading photoBeforeAdmission:", error);
        }
      }

      // Handle photoAfterAdmission
      if (req.files.photoAfterAdmission && req.files.photoAfterAdmission[0]) {
        try {
          photoAfterAdmissionUrl = await uploadPhotoToFirebase(
            req.files.photoAfterAdmission[0], 
            savedResident._id, 
            'after_admission'
          );
          savedResident.photoAfterAdmission = photoAfterAdmissionUrl;
        } catch (error) {
          console.error("Error uploading photoAfterAdmission:", error);
        }
      }

      // Handle legacy photo field for backward compatibility
      if (req.files.photo && req.files.photo[0]) {
        try {
          legacyPhotoUrl = await uploadPhotoToFirebase(
            req.files.photo[0], 
            savedResident._id, 
            'legacy_photo'
          );
          savedResident.photoUrl = legacyPhotoUrl;
        } catch (error) {
          console.error("Error uploading legacy photo:", error);
        }
      }
    }

    // Update resident with photo URLs
    if (photoBeforeAdmissionUrl || photoAfterAdmissionUrl || legacyPhotoUrl) {
      await savedResident.save();
      console.log("Resident updated with photo URLs:", {
        before: !!photoBeforeAdmissionUrl,
        after: !!photoAfterAdmissionUrl,
        legacy: !!legacyPhotoUrl
      });
    }

    res.status(201).json({
      success: true,
      message: "Resident registered successfully",
      data: savedResident,
    });
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Registration number already exists",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error registering resident",
      error: error.message,
    });
  }
});

// UPDATED PUT /api/residents/:id - Handle photo updates properly
router.put("/:id", photoUpload, async (req, res) => {
  console.log("PUT /api/residents/:id hit:", {
    id: req.params.id,
    body: req.body,
    files: req.files ? Object.keys(req.files) : "No files uploaded",
  });
  
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid resident ID" 
      });
    }

    const updateData = { ...req.body };
    
    // Handle photo uploads for updates
    if (req.files) {
      // Handle photoBeforeAdmission update
      if (req.files.photoBeforeAdmission && req.files.photoBeforeAdmission[0]) {
        try {
          const photoUrl = await uploadPhotoToFirebase(
            req.files.photoBeforeAdmission[0], 
            req.params.id, 
            'before_admission'
          );
          updateData.photoBeforeAdmission = photoUrl;
        } catch (error) {
          console.error("Error updating photoBeforeAdmission:", error);
        }
      }

      // Handle photoAfterAdmission update
      if (req.files.photoAfterAdmission && req.files.photoAfterAdmission[0]) {
        try {
          const photoUrl = await uploadPhotoToFirebase(
            req.files.photoAfterAdmission[0], 
            req.params.id, 
            'after_admission'
          );
          updateData.photoAfterAdmission = photoUrl;
        } catch (error) {
          console.error("Error updating photoAfterAdmission:", error);
        }
      }

      // Handle legacy photo update
      if (req.files.photo && req.files.photo[0]) {
        try {
          const photoUrl = await uploadPhotoToFirebase(
            req.files.photo[0], 
            req.params.id, 
            'legacy_photo'
          );
          updateData.photoUrl = photoUrl;
        } catch (error) {
          console.error("Error updating legacy photo:", error);
        }
      }
    }

    // Handle documentIds
    if (updateData.documentIds) {
      console.log("Received documentIds:", updateData.documentIds);
      if (
        !Array.isArray(updateData.documentIds) ||
        !updateData.documentIds.every((id) => isValidObjectId(id))
      ) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid documentIds format" 
        });
      }
      updateData.documentIds = updateData.documentIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    // Handle address update
    if (updateData.state || updateData.district || updateData.fullAddress) {
      updateData.address = {
        state: updateData.state,
        district: updateData.district,
        country: updateData.country || "India",
        fullAddress: updateData.fullAddress,
        city: updateData.city,
        pincode: updateData.pincode,
        latitude: updateData.latitude,
        longitude: updateData.longitude
      };
      
      // Remove individual fields after consolidating into address object
      delete updateData.state;
      delete updateData.district;
      delete updateData.country;
      delete updateData.fullAddress;
      delete updateData.city;
      delete updateData.pincode;
      delete updateData.latitude;
      delete updateData.longitude;
    }

    const resident = await Resident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!resident) {
      return res.status(404).json({ 
        success: false, 
        message: "Resident not found" 
      });
    }

    console.log("Resident updated:", resident._id);
    res.json({ success: true, data: resident });
  } catch (error) {
    console.error("Error in PUT /api/residents/:id:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/residents/export
router.get("/export", async (req, res) => {
  try {
    const {
      search = "",
      gender = "",
      healthStatus = "",
      category = "",
      bloodGroup = "",
      state = "",
      disabilityStatus = "",
      ageMin = "",
      ageMax = "",
      admissionDateStart = "",
      admissionDateEnd = "",
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameGivenByOrganization: { $regex: search, $options: "i" } },
        { registrationNo: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
      ];
    }
    if (gender) filter.gender = gender;
    if (healthStatus)
      filter.healthStatus = { $regex: healthStatus, $options: "i" };
    if (category) filter.category = { $regex: category, $options: "i" };
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (disabilityStatus)
      filter.disabilityStatus = { $regex: disabilityStatus, $options: "i" };
    if (state) filter["address.state"] = { $regex: state, $options: "i" };
    if (ageMin || ageMax) {
      filter.age = {};
      if (ageMin) filter.age.$gte = parseInt(ageMin);
      if (ageMax) filter.age.$lte = parseInt(ageMax);
    }
    if (admissionDateStart || admissionDateEnd) {
      filter.admissionDate = {};
      if (admissionDateStart)
        filter.admissionDate.$gte = new Date(admissionDateStart);
      if (admissionDateEnd)
        filter.admissionDate.$lte = new Date(admissionDateEnd);
    }

    const residents = await Resident.find(filter)
      .populate("documentIds")
      .lean();

    const excelData = residents.map((resident) => ({
      "Registration No": resident.registrationNo || "N/A",
      Name: resident.name || "N/A",
      "Organization Name": resident.nameGivenByOrganization || "N/A",
      Gender: resident.gender || "N/A",
      Age: resident.age || "N/A",
      "Date of Birth": resident.dateOfBirth
        ? new Date(resident.dateOfBirth).toLocaleDateString("en-IN")
        : "N/A",
      Phone: resident.mobileNo || "N/A",
      Address: resident.address
        ? `${resident.address.fullAddress || ""}, ${
            resident.address.district || ""
          }, ${resident.address.state || ""}, ${
            resident.address.country || ""
          }`.replace(/^,\s*|,\s*$/g, "")
        : "N/A",
      "Guardian Name": resident.guardianName || "N/A",
      "Health Status": resident.healthStatus || "N/A",
      Category: resident.category || "N/A",
      "Blood Group": resident.bloodGroup || "N/A",
      "Disability Status": resident.disabilityStatus || "N/A",
      Ward: resident.ward || "N/A",
      "Admission Date": resident.admissionDate
        ? new Date(resident.admissionDate).toLocaleDateString("en-IN")
        : "N/A",
      "Voter ID": resident.voterId || "N/A",
      Aadhaar: resident.aadhaarNumber || "N/A",
      Religion: resident.religion || "N/A",
      Weight: resident.weight || "N/A",
      Height: resident.height || "N/A",
      Comments: resident.comments || "N/A",
      Documents: resident.documentIds
        ? resident.documentIds.map((doc) => doc.name).join(", ")
        : "N/A",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 15 },
      { wch: 40 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 30 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Residents");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    const filename = `residents_export_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", excelBuffer.length);

    res.end(excelBuffer);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    res.status(500).json({
      success: false,
      message: "Export failed",
      error: error.message,
    });
  }
});

// GET /api/residents/:id - UPDATED to return all fields properly
router.get("/:id", async (req, res) => {
  console.log("Get resident route hit:", { residentId: req.params.id });
  try {
    if (!isValidObjectId(req.params.id)) {
      console.log("Invalid resident ID:", req.params.id);
      return res.status(400).json({
        success: false,
        message: `Invalid resident ID: ${req.params.id}`,
      });
    }

    const resident = await Resident.findById(req.params.id).populate("documentIds");
    if (!resident) {
      console.log("Resident not found:", req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: "Resident not found" 
      });
    }

    // UPDATED: Ensure all fields are included in response
    const residentData = resident.toObject();
    
    // Add photo information for display
    residentData.photos = {
      before: resident.photoBeforeAdmission || null,
      after: resident.photoAfterAdmission || null,
      legacy: resident.photoUrl || null,
      primary: resident.photoAfterAdmission || resident.photoBeforeAdmission || resident.photoUrl || null
    };

    console.log("Resident fetched with all fields:", {
      id: resident._id,
      fieldsCount: Object.keys(residentData).length,
      hasPhotos: {
        before: !!resident.photoBeforeAdmission,
        after: !!resident.photoAfterAdmission,
        legacy: !!resident.photoUrl
      }
    });
    
    res.json({ success: true, data: residentData });
  } catch (error) {
    console.error("Error in GET /api/residents/:id:", {
      message: error.message,
      stack: error.stack,
      residentId: req.params.id,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATED GET /api/residents - Include all fields in listing
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let searchQuery = {};
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      const exactPattern = new RegExp(searchTerm, "i");
      const wordsPattern = searchTerm
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));
      searchQuery.$or = [
        { name: exactPattern },
        { nameGivenByOrganization: exactPattern },
        { registrationNo: exactPattern },
        { "address.district": exactPattern },
        { "address.state": exactPattern },
        { mobileNo: exactPattern },
        { guardianName: exactPattern },
        { healthStatus: exactPattern },
        { category: exactPattern },
        ...wordsPattern.map((pattern) => ({ name: pattern })),
        ...wordsPattern.map((pattern) => ({
          nameGivenByOrganization: pattern,
        })),
        ...wordsPattern.map((pattern) => ({ "address.fullAddress": pattern })),
      ];
    }

    if (req.query.quickFilter) {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      switch (req.query.quickFilter) {
        case "recent":
          searchQuery.createdAt = { $gte: sevenDaysAgo };
          break;
        case "thisMonth":
          searchQuery.createdAt = { $gte: thirtyDaysAgo };
          break;
        case "healthConcerns":
          searchQuery.$or = [
            { healthStatus: /critical|serious|emergency|poor/i },
            { disabilityStatus: /severe|critical/i },
          ];
          break;
        case "needsAttention":
          searchQuery.$or = [
            { healthStatus: /poor|critical/i },
            { medications: { $exists: true, $ne: null, $ne: "" } },
          ];
          break;
        case "rehabilitation":
          searchQuery.rehabStatus = { $exists: true, $ne: null, $ne: "" };
          break;
      }
    }

    // Apply filters
    if (req.query.gender) searchQuery.gender = req.query.gender;
    if (req.query.healthStatus)
      searchQuery.healthStatus = {
        $regex: req.query.healthStatus,
        $options: "i",
      };
    if (req.query.category)
      searchQuery.category = { $regex: req.query.category, $options: "i" };
    if (req.query.bloodGroup) searchQuery.bloodGroup = req.query.bloodGroup;
    if (req.query.state)
      searchQuery["address.state"] = { $regex: req.query.state, $options: "i" };
    if (req.query.disabilityStatus)
      searchQuery.disabilityStatus = {
        $regex: req.query.disabilityStatus,
        $options: "i",
      };
    if (req.query.rehabStatus)
      searchQuery.rehabStatus = {
        $regex: req.query.rehabStatus,
        $options: "i",
      };
    if (req.query.ageMin || req.query.ageMax) {
      searchQuery.age = {};
      if (req.query.ageMin) searchQuery.age.$gte = parseInt(req.query.ageMin);
      if (req.query.ageMax) searchQuery.age.$lte = parseInt(req.query.ageMax);
    }
    if (req.query.admissionDateStart || req.query.admissionDateEnd) {
      searchQuery.admissionDate = {};
      if (req.query.admissionDateStart)
        searchQuery.admissionDate.$gte = new Date(req.query.admissionDateStart);
      if (req.query.admissionDateEnd)
        searchQuery.admissionDate.$lte = new Date(req.query.admissionDateEnd);
    }
    searchQuery.isActive =
      req.query.includeInactive === "true" ? { $in: [true, false] } : true;

    // Handle sorting
    let sortObject = { createdAt: -1 }; // default sort
    if (req.query.sortField && req.query.sortOrder) {
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

      // Map frontend field names to database field names
      const fieldMap = {
        name: "name",
        registrationNo: "registrationNo",
        admissionDate: "admissionDate",
        date: "admissionDate",
        dateOfBirth: "dateOfBirth",
        age: "age",
        gender: "gender",
        healthStatus: "healthStatus",
        rehabStatus: "rehabStatus",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      };

      if (fieldMap[sortField]) {
        sortObject = { [fieldMap[sortField]]: sortOrder };
        if (sortField === "name") {
          sortObject = {
            name: sortOrder,
            nameGivenByOrganization: sortOrder,
            createdAt: -1,
          };
        }
      }
    }

    // UPDATED: Select more fields for proper display
    const residents = await Resident.find(searchQuery)
      .select(
        "registrationNo admissionDate name nameGivenByOrganization gender age address healthStatus rehabStatus photoBeforeAdmission photoAfterAdmission photoUrl mobileNo guardianName bloodGroup category disabilityStatus createdAt updatedAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit);

    const total = await Resident.countDocuments(searchQuery);

    // UPDATED: Include more fields in formatted response
    const formattedResidents = residents.map((resident) => ({
      _id: resident._id,
      registrationNo: resident.registrationNo,
      date: resident.admissionDate ? resident.admissionDate.toLocaleDateString("en-IN") : "N/A",
      name: resident.name || resident.nameGivenByOrganization,
      gender: resident.gender,
      age: resident.age,
      placeName: resident.address?.district || resident.address?.state || "N/A",
      healthStatus: resident.healthStatus,
      rehabStatus: resident.rehabStatus,
      address: resident.address?.fullAddress || "N/A",
      mobileNo: resident.mobileNo,
      guardianName: resident.guardianName,
      bloodGroup: resident.bloodGroup,
      category: resident.category,
      disabilityStatus: resident.disabilityStatus,
      // UPDATED: Include photo information
      photoUrl: resident.photoAfterAdmission || resident.photoBeforeAdmission || resident.photoUrl,
      photos: {
        before: resident.photoBeforeAdmission,
        after: resident.photoAfterAdmission,
        legacy: resident.photoUrl
      },
      createdAt: resident.createdAt,
      updatedAt: resident.updatedAt
    }));

    res.json({
      success: true,
      data: formattedResidents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching residents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching residents",
      error: error.message,
    });
  }
});

// POST /api/residents/validate
router.post("/validate", async (req, res) => {
  try {
    const { field, value, context } = req.body;
    const validationResults = {};

    switch (field) {
      case "registrationNo":
        if (value) {
          const existing = await Resident.findOne({
            registrationNo: value,
            isActive: true,
            _id: { $ne: context?.residentId },
          });
          if (existing) {
            validationResults.registrationNo = {
              isValid: false,
              message: "Registration number already exists",
              suggestion: `Try: ${value}-${Math.floor(Math.random() * 100)}`,
            };
          } else {
            validationResults.registrationNo = {
              isValid: true,
              message: "Registration number is available",
            };
          }
        }
        break;
      case "mobileNo":
        const mobilePattern = /^[6-9]\d{9}$/;
        if (value) {
          if (!mobilePattern.test(value)) {
            validationResults.mobileNo = {
              isValid: false,
              message: "Invalid mobile number format",
              suggestion: "Enter 10-digit number starting with 6-9",
            };
          } else {
            const existing = await Resident.findOne({
              mobileNo: value,
              isActive: true,
              _id: { $ne: context?.residentId },
            });
            if (existing) {
              validationResults.mobileNo = {
                isValid: false,
                message: "Mobile number already registered",
                suggestion: `Already used by: ${existing.name}`,
              };
            } else {
              validationResults.mobileNo = {
                isValid: true,
                message: "Mobile number is valid",
              };
            }
          }
        }
        break;
      case "aadhaarNumber":
        const aadhaarPattern = /^\d{12}$/;
        if (value) {
          if (!aadhaarPattern.test(value)) {
            validationResults.aadhaarNumber = {
              isValid: false,
              message: "Invalid Aadhaar number",
              suggestion: "Enter 12 digits without spaces or dashes",
            };
          } else {
            validationResults.aadhaarNumber = {
              isValid: true,
              message: "Aadhaar number format is valid",
            };
          }
        }
        break;
      case "age":
        const ageNum = parseInt(value);
        if (value) {
          if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
            validationResults.age = {
              isValid: false,
              message: "Invalid age",
              suggestion: "Enter age between 0-120 years",
            };
          } else {
            validationResults.age = {
              isValid: true,
              message: "Age is valid",
            };
          }
        }
        break;
      default:
        validationResults[field] = {
          isValid: true,
          message: "Field validated",
        };
    }

    res.json({
      success: true,
      data: validationResults,
    });
  } catch (error) {
    console.error("Error validating field:", error);
    res.status(500).json({
      success: false,
      message: "Error validating field",
      error: error.message,
    });
  }
});

// All other existing routes (export, stats, delete, etc.) remain the same...
// [Include all your existing routes here - export, stats, delete, care-events, etc.]
// GET /api/residents/autocomplete/:field
router.get("/autocomplete/:field", async (req, res) => {
  try {
    const { field } = req.params;
    const { q = "", limit = 10 } = req.query;
    let suggestions = [];
    const searchPattern = new RegExp(q, "i");

    switch (field) {
      case "guardianName":
        const guardians = await Resident.distinct("guardianName", {
          guardianName: { $regex: searchPattern, $ne: null, $ne: "" },
          isActive: true,
        });
        suggestions = guardians.slice(0, limit);
        break;
      case "address.district":
        const districts = await Resident.distinct("address.district", {
          "address.district": { $regex: searchPattern, $ne: null, $ne: "" },
          isActive: true,
        });
        suggestions = districts.slice(0, limit);
        break;
      case "address.state":
        const states = await Resident.distinct("address.state", {
          "address.state": { $regex: searchPattern, $ne: null, $ne: "" },
          isActive: true,
        });
        suggestions = states.slice(0, limit);
        break;
      case "healthStatus":
        const healthStatuses = await Resident.distinct("healthStatus", {
          healthStatus: { $regex: searchPattern, $ne: null, $ne: "" },
          isActive: true,
        });
        suggestions = healthStatuses.slice(0, limit);
        break;
      case "category":
        const categories = await Resident.distinct("category", {
          category: { $regex: searchPattern, $ne: null, $ne: "" },
          isActive: true,
        });
        suggestions = categories.slice(0, limit);
        break;
      default:
        suggestions = [];
    }

    res.json({
      success: true,
      data: {
        field,
        query: q,
        suggestions: suggestions.filter((s) => s && s.trim()),
      },
    });
  } catch (error) {
    console.error("Error getting autocomplete suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Error getting suggestions",
      error: error.message,
    });
  }
});

// GET /api/residents/notifications
router.get("/notifications", async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const notifications = [];
    const recentCount = await Resident.countDocuments({
      isActive: true,
      createdAt: { $gte: sevenDaysAgo },
    });
    if (recentCount > 0) {
      notifications.push({
        id: "recent_registrations",
        type: "info",
        title: "New Registrations",
        message: `${recentCount} new resident${
          recentCount > 1 ? "s" : ""
        } registered in the last 7 days`,
        timestamp: new Date(),
        priority: "low",
      });
    }

    const healthConcerns = await Resident.countDocuments({
      isActive: true,
      $or: [
        { healthStatus: /critical|serious|emergency|poor/i },
        { disabilityStatus: /severe|critical/i },
      ],
    });
    if (healthConcerns > 0) {
      notifications.push({
        id: "health_concerns",
        type: "warning",
        title: "Health Attention Required",
        message: `${healthConcerns} resident${
          healthConcerns > 1 ? "s" : ""
        } may need immediate health attention`,
        timestamp: new Date(),
        priority: "high",
      });
    }

    const incompleteRecords = await Resident.countDocuments({
      isActive: true,
      $or: [
        { mobileNo: { $in: [null, ""] } },
        { guardianName: { $in: [null, ""] } },
        { healthStatus: { $in: [null, ""] } },
      ],
    });
    if (incompleteRecords > 0) {
      notifications.push({
        id: "incomplete_records",
        type: "warning",
        title: "Incomplete Records",
        message: `${incompleteRecords} record${
          incompleteRecords > 1 ? "s have" : " has"
        } missing important information`,
        timestamp: new Date(),
        priority: "medium",
      });
    }

    const totalResidents = await Resident.countDocuments({ isActive: true });
    const monthlyGrowth = await Resident.countDocuments({
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo },
    });
    if (monthlyGrowth > 10) {
      notifications.push({
        id: "growth_milestone",
        type: "success",
        title: "Growth Milestone",
        message: `Excellent progress! ${monthlyGrowth} new registrations this month`,
        timestamp: new Date(),
        priority: "low",
      });
    }

    res.json({
      success: true,
      data: {
        notifications: notifications.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }),
        summary: {
          total: notifications.length,
          high: notifications.filter((n) => n.priority === "high").length,
          medium: notifications.filter((n) => n.priority === "medium").length,
          low: notifications.filter((n) => n.priority === "low").length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
});

// GET /api/residents/search/smart
router.get("/search/smart", async (req, res) => {
  try {
    const {
      q: searchTerm = "",
      quickFilter = "",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let searchQuery = {};
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      const exactPattern = new RegExp(term, "i");
      const wordsPattern = term
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));
      searchQuery.$or = [
        { name: exactPattern },
        { nameGivenByOrganization: exactPattern },
        { registrationNo: exactPattern },
        { "address.district": exactPattern },
        { "address.state": exactPattern },
        { mobileNo: exactPattern },
        { guardianName: exactPattern },
        ...wordsPattern.map((pattern) => ({ name: pattern })),
        ...wordsPattern.map((pattern) => ({
          nameGivenByOrganization: pattern,
        })),
        ...wordsPattern.map((pattern) => ({ "address.fullAddress": pattern })),
      ];
    }

    if (quickFilter) {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      switch (quickFilter) {
        case "recent":
          searchQuery.createdAt = { $gte: sevenDaysAgo };
          break;
        case "thisMonth":
          searchQuery.createdAt = { $gte: thirtyDaysAgo };
          break;
        case "healthConcerns":
          searchQuery.$or = [
            { healthStatus: /critical|serious|emergency|poor/i },
            { disabilityStatus: /severe|critical/i },
          ];
          break;
        case "needsAttention":
          searchQuery.$or = [
            { healthStatus: /poor|critical/i },
            { medications: { $exists: true, $ne: null, $ne: "" } },
          ];
          break;
        case "rehabilitation":
          searchQuery.rehabStatus = { $exists: true, $ne: null, $ne: "" };
          break;
      }
    }

    searchQuery.isActive = true;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const residents = await Resident.find(searchQuery)
      .select(
        "registrationNo admissionDate name nameGivenByOrganization gender age address healthStatus createdAt"
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resident.countDocuments(searchQuery);

    const formattedResidents = residents.map((resident) => ({
      _id: resident._id,
      registrationNo: resident.registrationNo,
      date: resident.admissionDate.toLocaleDateString("en-IN"),
      name: resident.nameGivenByOrganization || resident.name,
      gender: resident.gender,
      age: resident.age,
      placeName: resident.address?.district || resident.address?.state || "N/A",
      healthStatus: resident.healthStatus,
      address: resident.address?.fullAddress || "N/A",
      createdAt: resident.createdAt,
    }));

    res.json({
      success: true,
      data: formattedResidents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
      searchInfo: {
        query: searchTerm,
        quickFilter,
        resultsFound: total,
      },
    });
  } catch (error) {
    console.error("Error in smart search:", error);
    res.status(500).json({
      success: false,
      message: "Error performing smart search",
      error: error.message,
    });
  }
});

// GET /api/residents/stats/enhanced
router.get("/stats/enhanced", async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

    const totalResidents = await Resident.countDocuments({ isActive: true });
    const todayRegistrations = await Resident.countDocuments({
      isActive: true,
      createdAt: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });
    const thisMonthRegistrations = await Resident.countDocuments({
      isActive: true,
      createdAt: { $gte: thisMonth },
    });
    const lastMonthRegistrations = await Resident.countDocuments({
      isActive: true,
      createdAt: { $gte: lastMonth, $lt: thisMonth },
    });

    const genderStats = await Resident.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    const healthStatusStats = await Resident.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$healthStatus", count: { $sum: 1 } } },
    ]);

    const ageStats = await Resident.aggregate([
      { $match: { isActive: true, age: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ["$age", 18] }, then: "0-17" },
                { case: { $lt: ["$age", 30] }, then: "18-29" },
                { case: { $lt: ["$age", 50] }, then: "30-49" },
                { case: { $lt: ["$age", 65] }, then: "50-64" },
                { case: { $gte: ["$age", 65] }, then: "65+" },
              ],
              default: "Unknown",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlyTrends = await Resident.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const stateStats = await Resident.aggregate([
      {
        $match: {
          isActive: true,
          "address.state": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$address.state", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const healthAlerts = await Resident.countDocuments({
      isActive: true,
      $or: [
        { healthStatus: /critical|serious|emergency|poor/i },
        { disabilityStatus: /severe|critical/i },
      ],
    });

    const growthRate =
      lastMonthRegistrations > 0
        ? (
            ((thisMonthRegistrations - lastMonthRegistrations) /
              lastMonthRegistrations) *
            100
          ).toFixed(1)
        : thisMonthRegistrations > 0
        ? 100
        : 0;

    res.json({
      success: true,
      data: {
        metrics: {
          totalResidents,
          todayRegistrations,
          thisMonthRegistrations,
          growthRate: parseFloat(growthRate),
          healthAlerts,
        },
        charts: {
          genderDistribution: genderStats.map((item) => ({
            label: item._id || "Unknown",
            value: item.count,
            percentage: ((item.count / totalResidents) * 100).toFixed(1),
          })),
          healthStatus: healthStatusStats.map((item) => ({
            label: item._id || "Unknown",
            value: item.count,
            percentage: ((item.count / totalResidents) * 100).toFixed(1),
          })),
          ageDistribution: ageStats.map((item) => ({
            label: item._id,
            value: item.count,
            percentage: ((item.count / totalResidents) * 100).toFixed(1),
          })),
          monthlyTrends: monthlyTrends.map((item) => ({
            month: `${item._id.year}-${item._id.month
              .toString()
              .padStart(2, "0")}`,
            count: item.count,
          })),
          stateDistribution: stateStats.map((item) => ({
            label: item._id,
            value: item.count,
            percentage: ((item.count / totalResidents) * 100).toFixed(1),
          })),
        },
        insights: [
          {
            type: "growth",
            message:
              growthRate > 0
                ? `${growthRate}% growth this month`
                : growthRate < 0
                ? `${Math.abs(growthRate)}% decrease this month`
                : "No growth this month",
            trend: growthRate > 0 ? "up" : growthRate < 0 ? "down" : "stable",
          },
          {
            type: "health",
            message:
              healthAlerts > 0
                ? `${healthAlerts} residents need health attention`
                : "No immediate health concerns",
            priority: healthAlerts > 0 ? "high" : "low",
          },
          {
            type: "activity",
            message:
              todayRegistrations > 0
                ? `${todayRegistrations} new registration${
                    todayRegistrations > 1 ? "s" : ""
                  } today`
                : "No new registrations today",
            trend: todayRegistrations > 0 ? "active" : "quiet",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching enhanced stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching enhanced statistics",
      error: error.message,
    });
  }
});

// GET /api/residents/stats/summary
router.get("/stats/summary", async (req, res) => {
  try {
    const totalResidents = await Resident.countDocuments({ isActive: true });
    const todayRegistrations = await Resident.countDocuments({
      isActive: true,
      createdAt: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });

    const genderStats = await Resident.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    const healthStatusStats = await Resident.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$healthStatus", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalResidents,
        todayRegistrations,
        genderStats,
        healthStatusStats,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

// GET /api/residents
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let searchQuery = {};
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      const exactPattern = new RegExp(searchTerm, "i");
      const wordsPattern = searchTerm
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));
      searchQuery.$or = [
        { name: exactPattern },
        { nameGivenByOrganization: exactPattern },
        { registrationNo: exactPattern },
        { "address.district": exactPattern },
        { "address.state": exactPattern },
        { mobileNo: exactPattern },
        { guardianName: exactPattern },
        { healthStatus: exactPattern },
        { category: exactPattern },
        ...wordsPattern.map((pattern) => ({ name: pattern })),
        ...wordsPattern.map((pattern) => ({
          nameGivenByOrganization: pattern,
        })),
        ...wordsPattern.map((pattern) => ({ "address.fullAddress": pattern })),
      ];
    }

    if (req.query.quickFilter) {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      switch (req.query.quickFilter) {
        case "recent":
          searchQuery.createdAt = { $gte: sevenDaysAgo };
          break;
        case "thisMonth":
          searchQuery.createdAt = { $gte: thirtyDaysAgo };
          break;
        case "healthConcerns":
          searchQuery.$or = [
            { healthStatus: /critical|serious|emergency|poor/i },
            { disabilityStatus: /severe|critical/i },
          ];
          break;
        case "needsAttention":
          searchQuery.$or = [
            { healthStatus: /poor|critical/i },
            { medications: { $exists: true, $ne: null, $ne: "" } },
          ];
          break;
        case "rehabilitation":
          searchQuery.rehabStatus = { $exists: true, $ne: null, $ne: "" };
          break;
      }
    }

    if (req.query.gender) searchQuery.gender = req.query.gender;
    if (req.query.healthStatus)
      searchQuery.healthStatus = {
        $regex: req.query.healthStatus,
        $options: "i",
      };
    if (req.query.category)
      searchQuery.category = { $regex: req.query.category, $options: "i" };
    if (req.query.bloodGroup) searchQuery.bloodGroup = req.query.bloodGroup;
    if (req.query.state)
      searchQuery["address.state"] = { $regex: req.query.state, $options: "i" };
    if (req.query.disabilityStatus)
      searchQuery.disabilityStatus = {
        $regex: req.query.disabilityStatus,
        $options: "i",
      };
    if (req.query.rehabStatus)
      searchQuery.rehabStatus = {
        $regex: req.query.rehabStatus,
        $options: "i",
      };
    if (req.query.ageMin || req.query.ageMax) {
      searchQuery.age = {};
      if (req.query.ageMin) searchQuery.age.$gte = parseInt(req.query.ageMin);
      if (req.query.ageMax) searchQuery.age.$lte = parseInt(req.query.ageMax);
    }
    if (req.query.admissionDateStart || req.query.admissionDateEnd) {
      searchQuery.admissionDate = {};
      if (req.query.admissionDateStart)
        searchQuery.admissionDate.$gte = new Date(req.query.admissionDateStart);
      if (req.query.admissionDateEnd)
        searchQuery.admissionDate.$lte = new Date(req.query.admissionDateEnd);
    }
    searchQuery.isActive =
      req.query.includeInactive === "true" ? { $in: [true, false] } : true;

    // Handle sorting
    let sortObject = { createdAt: -1 }; // default sort
    if (req.query.sortField && req.query.sortOrder) {
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

      // Map frontend field names to database field names
      const fieldMap = {
        name: "name",
        registrationNo: "registrationNo",
        admissionDate: "admissionDate",
        date: "admissionDate", // alias for admissionDate
        dateOfBirth: "dateOfBirth",
        age: "age",
        gender: "gender",
        healthStatus: "healthStatus",
        rehabStatus: "rehabStatus",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      };

      if (fieldMap[sortField]) {
        sortObject = { [fieldMap[sortField]]: sortOrder };
        // For name sorting, also sort by nameGivenByOrganization as secondary
        if (sortField === "name") {
          sortObject = {
            name: sortOrder,
            nameGivenByOrganization: sortOrder,
            createdAt: -1,
          };
        }
      }
    }

    const residents = await Resident.find(searchQuery)
      .select(
        "registrationNo admissionDate name nameGivenByOrganization gender age address healthStatus rehabStatus createdAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit);

    const total = await Resident.countDocuments(searchQuery);

    const formattedResidents = residents.map((resident) => ({
      _id: resident._id,
      registrationNo: resident.registrationNo,
      date: resident.admissionDate.toLocaleDateString("en-IN"),
      name: resident.name || resident.nameGivenByOrganization,
      gender: resident.gender,
      age: resident.age,
      placeName: resident.address?.district || resident.address?.state || "N/A",
      healthStatus: resident.healthStatus,
      rehabStatus: resident.rehabStatus,
      address: resident.address?.fullAddress || "N/A",
      createdAt: resident.createdAt,
    }));

    res.json({
      success: true,
      data: formattedResidents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching residents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching residents",
      error: error.message,
    });
  }
});

// POST /api/residents
router.post("/", upload.single("photo"), async (req, res) => {
  console.log("Create resident route hit:", {
    body: req.body,
    file: req.file ? req.file.originalname : "No file uploaded",
  });

  try {
    const residentData = { ...req.body };
    const documentIds = req.body.documentIds
      ? JSON.parse(req.body.documentIds)
      : [];

    // Validate documentIds
    if (documentIds.length > 0) {
      for (const docId of documentIds) {
        if (!isValidObjectId(docId)) {
          console.log("Invalid document ID:", docId);
          return res.status(400).json({
            success: false,
            message: `Invalid document ID: ${docId}`,
          });
        }
      }
    }

    // Handle photo upload to Firebase Storage
    let photoUrl = null;
    if (req.file) {
      const fileName = `residents/${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(fileName);
      await fileUpload.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      const [downloadUrl] = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });
      photoUrl = downloadUrl;
      console.log("Photo uploaded to Firebase:", { fileName, photoUrl });
    } else {
      console.log("No photo file received");
    }

    // Generate registration number if not provided
    if (!residentData.registrationNo) {
      residentData.registrationNo = await Resident.generateRegistrationNo();
      console.log("Generated registrationNo:", residentData.registrationNo);
    }

    // Restructure address data
    if (
      residentData.state ||
      residentData.district ||
      residentData.country ||
      residentData.fullAddress
    ) {
      residentData.address = {
        state: residentData.state,
        district: residentData.district,
        country: residentData.country || "India",
        fullAddress: residentData.fullAddress,
      };
      delete residentData.state;
      delete residentData.district;
      delete residentData.country;
      delete residentData.fullAddress;
    }

    // Map form field names to schema field names
    const fieldMapping = {
      conveyanceNo: "conveyanceVehicleNo",
      pickPlace: "pickUpPlace",
      aadhaar: "aadhaarNumber",
    };
    Object.keys(fieldMapping).forEach((oldKey) => {
      if (residentData[oldKey] !== undefined) {
        residentData[fieldMapping[oldKey]] = residentData[oldKey];
        delete residentData[oldKey];
      }
    });

    // Create new resident
    const resident = new Resident({
      ...residentData,
      photoUrl,
      documentIds,
    });
    const savedResident = await resident.save();
    console.log("Resident created:", {
      id: savedResident._id,
      registrationNo: savedResident.registrationNo,
      photoUrl: savedResident.photoUrl,
    });

    res.status(201).json({
      success: true,
      message: "Resident registered successfully",
      data: savedResident,
    });
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Registration number already exists",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error registering resident",
      error: error.message,
    });
  }
});

// GET /api/residents/:id
router.get("/:id", async (req, res) => {
  console.log("Get resident route hit:", { residentId: req.params.id });
  try {
    if (!isValidObjectId(req.params.id)) {
      console.log("Invalid resident ID:", req.params.id);
      return res.status(400).json({
        success: false,
        message: `Invalid resident ID: ${req.params.id}`,
      });
    }

    const resident = await Resident.findById(req.params.id).populate(
      "documentIds"
    );
    if (!resident) {
      console.log("Resident not found:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Resident not found" });
    }

    console.log("Resident fetched:", {
      id: resident._id,
      photoUrl: resident.photoUrl,
    });
    res.json({ success: true, data: resident });
  } catch (error) {
    console.error("Error in GET /api/residents/:id:", {
      message: error.message,
      stack: error.stack,
      residentId: req.params.id,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/residents/:id
// routes/residents.js (PUT /api/residents/:id)
router.put("/:id", upload.single("photoUpload"), async (req, res) => {
  console.log("PUT /api/residents/:id hit:", {
    id: req.params.id,
    body: req.body,
  });
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid resident ID" });
    }

    const updateData = req.body;
    if (req.file) {
      const fileName = `residents/${req.params.id}/${Date.now()}_${
        req.file.originalname
      }`;
      const fileUpload = bucket.file(fileName);
      await fileUpload.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      const [downloadUrl] = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });
      updateData.photoUrl = downloadUrl;
    }

    if (updateData.documentIds) {
      console.log("Received documentIds:", updateData.documentIds);
      if (
        !Array.isArray(updateData.documentIds) ||
        !updateData.documentIds.every((id) => isValidObjectId(id))
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid documentIds format" });
      }
      updateData.documentIds = updateData.documentIds.map((id) =>
        mongoose.Types.ObjectId(id)
      );
    }

    const resident = await Resident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!resident) {
      return res
        .status(404)
        .json({ success: false, message: "Resident not found" });
    }

    console.log("Resident updated:", resident._id);
    res.json({ success: true, data: resident });
  } catch (error) {
    console.error("Error in PUT /api/residents/:id:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  console.log("Delete resident route hit:", { residentId: req.params.id });

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log("Invalid resident ID:", req.params.id);
      return res.status(400).json({
        success: false,
        message: `Invalid resident ID: ${req.params.id}`,
      });
    }

    // Find the resident
    const resident = await Resident.findById(req.params.id);
    if (!resident) {
      console.log("Resident not found:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    // Step 1: Delete associated documents from MongoDB
    const documents = await Document.find({ residentId: req.params.id });
    console.log("Found documents to delete:", documents.length);

    // Step 2: Delete files from Firebase Storage
    const deletePromises = [];

    // Delete photo from Firebase if photoUrl exists
    if (resident.photoUrl) {
      try {
        const fileName = decodeURIComponent(
          resident.photoUrl.split("/o/")[1].split("?")[0]
        );
        console.log("Deleting photo from Firebase:", fileName);
        deletePromises.push(bucket.file(fileName).delete());
      } catch (error) {
        console.error("Error preparing photo deletion:", error);
      }
    }

    // Delete document files from Firebase
    for (const doc of documents) {
      if (doc.fileUrl) {
        try {
          const fileName = decodeURIComponent(
            doc.fileUrl.split("/o/")[1].split("?")[0]
          );
          console.log("Deleting document from Firebase:", fileName);
          deletePromises.push(bucket.file(fileName).delete());
        } catch (error) {
          console.error("Error preparing document deletion:", error);
        }
      }
    }

    // Execute Firebase deletions
    await Promise.all(deletePromises).catch((error) => {
      console.error("Firebase deletion errors:", error);
      // Continue deletion even if some files fail (e.g., already deleted)
    });

    // Step 3: Delete documents from MongoDB
    await Document.deleteMany({ residentId: req.params.id });
    console.log("Documents deleted from MongoDB for resident:", req.params.id);

    // Step 4: Delete resident from MongoDB
    await Resident.findByIdAndDelete(req.params.id);
    console.log("Resident deleted:", req.params.id);

    res.json({
      success: true,
      message: "Resident and associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete resident error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error deleting resident",
      error: error.message,
    });
  }
});

// GET /api/residents/:id/preview
router.get("/:id/preview", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Generating preview for resident ID: ${id}`);
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID format",
      });
    }
    const resident = await Resident.findById(id).populate("documentIds");
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      info: {
        Title: `Resident Details - ${resident.registrationNo || resident._id}`,
        Author: "Gharpan Organization",
        Subject: "Resident Registration Details",
        Keywords: "resident, registration, details, gharpan",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=resident-${
        resident.registrationNo || resident._id
      }-preview.pdf`
    );
    doc.pipe(res);

    const addField = (label, value, yPos, isMultiline = false) => {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#2563eb")
        .text(label + ":", 60, yPos, { width: 150 });
      doc.font("Helvetica").fillColor("#374151");
      if (isMultiline && value && value.length > 50) {
        doc.text(value || "N/A", 220, yPos, { width: 320, align: "left" });
        return yPos + Math.ceil((value || "N/A").length / 55) * 12 + 8;
      } else {
        doc.text(value || "N/A", 220, yPos, { width: 320 });
        return yPos + 16;
      }
    };

    const addSectionHeader = (title, yPos) => {
      doc
        .moveTo(60, yPos - 10)
        .lineTo(540, yPos - 10)
        .strokeColor("#2563eb")
        .lineWidth(1)
        .stroke();
      doc.rect(40, yPos - 5, 520, 22).fillAndStroke("#f8fafc", "#2563eb");
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1e40af")
        .text(title, 50, yPos + 2);
      return yPos + 30;
    };

    doc.rect(0, 0, doc.page.width, 120).fillAndStroke("#2563eb", "#1e40af");
    doc.rect(50, 20, 60, 60).fillAndStroke("#ffffff", "#2563eb").lineWidth(2);
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#2563eb")
      .text("LOGO", 70, 45);
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("GHARPAN ORGANIZATION", 130, 25);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#e0e7ff")
      .text("Residential Care & Rehabilitation Center", 130, 50)
      .text("Registration & Documentation System", 130, 65);
    doc.rect(50, 85, 500, 25).fillAndStroke("#ffffff", "#2563eb");
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text("RESIDENT REGISTRATION DETAILS", 50, 92, {
        align: "center",
        width: 500,
      });
    doc.fillColor("#000000");
    doc
      .fontSize(50)
      .font("Helvetica-Bold")
      .fillColor("#0ea5e9")
      .opacity(0.08)
      .text("PREVIEW", 180, 400, { rotate: -45 })
      .opacity(1);

    let yPosition = 150;
    doc
      .rect(45, yPosition + 5, 520, 55)
      .fillColor("#f8fafc")
      .fill();
    doc
      .rect(40, yPosition, 520, 55)
      .fillAndStroke("#ffffff", "#2563eb")
      .lineWidth(2);
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text(
        resident.nameGivenByOrganization || resident.name || "N/A",
        55,
        yPosition + 10
      );
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#374151")
      .text(
        `Registration: ${resident.registrationNo || "N/A"}`,
        55,
        yPosition + 35
      )
      .text(
        `Preview Generated: ${new Date().toLocaleDateString("en-IN")}`,
        300,
        yPosition + 35
      );

    yPosition = 230;
    yPosition = addSectionHeader("PERSONAL INFORMATION", yPosition);
    yPosition = addField(
      "Registration Number",
      resident.registrationNo,
      yPosition
    );
    yPosition = addField("Full Name", resident.name, yPosition);
    yPosition = addField("Gender", resident.gender, yPosition);
    yPosition = addField("Age", resident.age?.toString(), yPosition);
    yPosition += 20;
    yPosition = addSectionHeader("CONTACT & ADDRESS INFORMATION", yPosition);
    yPosition = addField("Mobile Number", resident.mobileNo, yPosition);
    yPosition = addField(
      "Address",
      resident.address?.fullAddress,
      yPosition,
      true
    );
    yPosition = addField("Email Address", resident.emailAddress, yPosition);
    yPosition = addField("VoterId", resident.voterId, yPosition);
    yPosition = addField("Aadhar Number", resident.aadhaarNumber, yPosition);
    yPosition += 20;
    yPosition = addSectionHeader("HEALTH INFORMATION", yPosition);
    yPosition = addField("Health Status", resident.healthStatus, yPosition);
    yPosition = addField("Blood Group", resident.bloodGroup, yPosition);
    yPosition += 20;
    yPosition = addSectionHeader("DOCUMENTS", yPosition);
    yPosition = addField(
      "Documents",
      resident.documentIds
        ? resident.documentIds.map((doc) => doc.name).join(", ")
        : "None",
      yPosition,
      true
    );

    const footerY = doc.page.height - 80;
    doc
      .rect(40, footerY, 520, 60)
      .fillAndStroke("#f8fafc", "#2563eb")
      .lineWidth(2);
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text("PREVIEW MODE", 50, footerY + 15, { align: "center", width: 520 });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#374151")
      .text(
        "This is a preview with limited information. Download for complete details.",
        50,
        footerY + 35,
        { align: "center", width: 520 }
      );

    doc.end();
  } catch (error) {
    console.error("Error previewing resident details:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error previewing resident details",
      error: error.message,
    });
  }
});

// GET /api/residents/:id/download
router.get("/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Downloading details for resident ID: ${id}`);
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID format",
      });
    }
    const { format = "pdf", template = "detailed" } = req.query;
    const resident = await Resident.findById(id).populate("documentIds");
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `Resident ${
            template === "summary"
              ? "Summary"
              : template === "medical"
              ? "Medical Record"
              : "Details"
          } - ${resident.registrationNo || resident._id}`,
          Author: "Gharpan Organization",
          Subject: `Resident ${
            template.charAt(0).toUpperCase() + template.slice(1)
          } Report`,
          Keywords: "resident, registration, details, gharpan, " + template,
        },
      });

      const primaryGreen = "#0A400C";
      const lightGreen = "#E8F5E8";
      const creamBackground = "#FEFCF2";
      const darkGray = "#374151";
      const lightGray = "#6B7280";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=resident-${
          resident.registrationNo || resident._id
        }-${template}.pdf`
      );
      doc.pipe(res);

      // Helper function to check if we need a new page
      const checkPageBreak = (yPos, requiredSpace = 100) => {
        if (yPos + requiredSpace > doc.page.height - 80) {
          // Only add a new page if we're not at the very beginning of content
          if (yPos > 100) {
            doc.addPage();
            return 50;
          }
        }
        return yPos;
      };

      // Improved field rendering with no overlap
      const addField = (label, value, yPos, fullWidth = false) => {
        yPos = checkPageBreak(yPos, 40);
        
        const xPos = 40;
        const fieldWidth = fullWidth ? 520 : 250;
        const labelWidth = 140;
        const valueWidth = fieldWidth - labelWidth - 10;
        
        // Calculate height needed for value text
        const valueText = value || "N/A";
        let lines = 1;
        if (valueText.length > 30) {
          lines = Math.ceil(valueText.length / 45);
        }
        const fieldHeight = Math.max(25, lines * 12 + 10);
        
        doc
          .rect(xPos, yPos, fieldWidth, fieldHeight)
          .fillAndStroke(creamBackground, "#E5E7EB")
          .lineWidth(0.5);
        
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text(label + ":", xPos + 5, yPos + 8, { width: labelWidth - 5 });
        
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(darkGray)
          .text(valueText, xPos + labelWidth, yPos + 8, {
            width: valueWidth,
            align: "left",
          });
        
        return yPos + fieldHeight + 5;
      };

      // Two column layout for compact fields
      const addFieldPair = (label1, value1, label2, value2, yPos) => {
        yPos = checkPageBreak(yPos, 40);
        
        const xPos1 = 40;
        const xPos2 = 310;
        const fieldWidth = 250;
        const labelWidth = 110;
        const valueWidth = fieldWidth - labelWidth - 10;
        
        // Left field
        doc
          .rect(xPos1, yPos, fieldWidth, 25)
          .fillAndStroke(creamBackground, "#E5E7EB")
          .lineWidth(0.5);
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text(label1 + ":", xPos1 + 5, yPos + 8, { width: labelWidth - 5 });
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(darkGray)
          .text(value1 || "N/A", xPos1 + labelWidth, yPos + 8, {
            width: valueWidth,
            align: "left",
          });
        
        // Right field
        doc
          .rect(xPos2, yPos, fieldWidth, 25)
          .fillAndStroke(creamBackground, "#E5E7EB")
          .lineWidth(0.5);
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text(label2 + ":", xPos2 + 5, yPos + 8, { width: labelWidth - 5 });
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(darkGray)
          .text(value2 || "N/A", xPos2 + labelWidth, yPos + 8, {
            width: valueWidth,
            align: "left",
          });
        
        return yPos + 30;
      };

      const addSectionHeader = (title, yPos) => {
        yPos = checkPageBreak(yPos, 50);
        doc
          .rect(30, yPos, 540, 28)
          .fillAndStroke(lightGreen, primaryGreen)
          .lineWidth(2);
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text(title, 45, yPos + 8);
        return yPos + 40;
      };

      // Helper function to download image from URL and convert to buffer
      const downloadImage = (url) => {
        return new Promise((resolve, reject) => {
          https.get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download image: ${response.statusCode}`));
              return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });
      };

      // Fixed photo function - download images and convert to base64
      const addPhotos = async (yPos) => {
        yPos = checkPageBreak(yPos, 200);

        const photoWidth = 140;
        const photoHeight = 180;
        const xPosLeft = 80;
        const xPosRight = 360;

        // Before Admission Photo
        doc.rect(xPosLeft, yPos, photoWidth, photoHeight).stroke("#d1d5db");
        if (resident.photoBeforeAdmission) {
          try {
            const imageBuffer = await downloadImage(resident.photoBeforeAdmission);
            doc.image(imageBuffer, xPosLeft + 5, yPos + 5, {
              fit: [photoWidth - 10, photoHeight - 10],
              align: 'center',
              valign: 'center'
            });
          } catch (err) {
            console.log("Error loading before photo:", err);
            doc.fontSize(8).fillColor(lightGray).text("Photo unavailable", xPosLeft + 20, yPos + 85, { width: photoWidth - 40, align: 'center' });
          }
        } else {
          doc.fontSize(8).fillColor(lightGray).text("No photo", xPosLeft + 20, yPos + 85, { width: photoWidth - 40, align: 'center' });
        }
        doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryGreen).text("Before Admission", xPosLeft, yPos + photoHeight + 8, { width: photoWidth, align: 'center' });

        // After Admission Photo
        doc.rect(xPosRight, yPos, photoWidth, photoHeight).stroke("#d1d5db");
        if (resident.photoAfterAdmission) {
          try {
            const imageBuffer = await downloadImage(resident.photoAfterAdmission);
            doc.image(imageBuffer, xPosRight + 5, yPos + 5, {
              fit: [photoWidth - 10, photoHeight - 10],
              align: 'center',
              valign: 'center'
            });
          } catch (err) {
            console.log("Error loading after photo:", err);
            doc.fontSize(8).fillColor(lightGray).text("Photo unavailable", xPosRight + 20, yPos + 85, { width: photoWidth - 40, align: 'center' });
          }
        } else {
          doc.fontSize(8).fillColor(lightGray).text("No photo", xPosRight + 20, yPos + 85, { width: photoWidth - 40, align: 'center' });
        }
        doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryGreen).text("After Admission", xPosRight, yPos + photoHeight + 8, { width: photoWidth, align: 'center' });

        return yPos + photoHeight + 40;
      };

      // HEADER
      doc
        .rect(0, 0, doc.page.width, doc.page.height)
        .fillAndStroke("#FFFFFF", "#FFFFFF");
      doc
        .rect(0, 0, doc.page.width, 100)
        .fillAndStroke(primaryGreen, primaryGreen);
      doc
        .rect(40, 15, 70, 70)
        .fillAndStroke("#FFFFFF", primaryGreen)
        .lineWidth(3);

      // Try to load the logo image
      try {
        let logoPath;

        // Try multiple possible paths for different environments
        const possiblePaths = [
          path.join(__dirname, 'public/image1.jpg'), // Logo in backend public directory
          path.join(__dirname, '../frontend/src/images/image1.jpg'), // Local development
          path.join(__dirname, '../../frontend/src/images/image1.jpg'), // Some deployment structures
          path.join(__dirname, 'logo.jpg'), // Logo in backend directory
          path.join(process.cwd(), 'frontend/src/images/image1.jpg'), // From project root
          path.join(process.cwd(), 'logo.jpg'), // Logo in project root
        ];

        // Find the first existing path
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            logoPath = testPath;
            break;
          }
        }

        if (!logoPath) {
          throw new Error('Logo file not found in any expected location');
        }

        const logoBuffer = fs.readFileSync(logoPath);
        doc.image(logoBuffer, 45, 20, {
          fit: [60, 60],
          align: 'center',
          valign: 'center'
        });
      } catch (err) {
        console.log("Error loading logo:", err.message);
        // Fallback to text if logo can't be loaded
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text("GHARPAN", 55, 40)
          .text("LOGO", 60, 55);
      }
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text("Gharpan Dashboard", 130, 20);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#E0F2E0")
        .text("Overview of all rehabilitation activities and records.", 130, 45)
        .text("Residential Care & Rehabilitation Center", 130, 60);
      doc
        .fontSize(8)
        .fillColor("#E0F2E0")
        .text(
          `Generated: ${new Date().toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          400,
          75
        );

      if (template === "summary") {
        doc.rect(50, 85, 500, 25).fillAndStroke("#ffffff", "#2563eb");
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1e40af")
          .text("RESIDENT SUMMARY REPORT", 50, 92, {
            align: "center",
            width: 500,
          });

        let yPosition = 130;
        doc
          .rect(40, yPosition, 520, 50)
          .fillAndStroke("#ffffff", "#2563eb")
          .lineWidth(2);
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1e40af")
          .text(
            resident.nameGivenByOrganization || resident.name || "N/A",
            50,
            yPosition + 8
          );
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#6b7280")
          .text(
            `Registration: ${resident.registrationNo || "N/A"}`,
            50,
            yPosition + 25
          )
          .text(
            `Generated: ${new Date().toLocaleDateString("en-IN")}`,
            350,
            yPosition + 25
          );

        yPosition = 200;
        yPosition = addSectionHeader("ESSENTIAL INFORMATION", yPosition);
        yPosition = addField("Name", resident.name, yPosition);
        yPosition = addFieldPair("Gender", resident.gender, "Age", resident.age?.toString(), yPosition);
        yPosition = addField("Health Status", resident.healthStatus, yPosition);
        yPosition = addField("Contact", resident.mobileNo, yPosition);
        yPosition = addField("Guardian", resident.guardianName, yPosition);
        yPosition = addField(
          "Documents",
          resident.documentIds && resident.documentIds.length > 0
            ? resident.documentIds.map((doc) => doc.name).join(", ")
            : "None",
          yPosition,
          true
        );

        doc.end();
      } else if (template === "medical") {
        doc.rect(50, 85, 500, 25).fillAndStroke("#ffffff", "#2563eb");
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1e40af")
          .text("MEDICAL RECORD REPORT", 50, 92, {
            align: "center",
            width: 500,
          });

        let yPosition = 130;
        doc
          .rect(40, yPosition, 520, 70)
          .fillAndStroke("#ffffff", "#2563eb")
          .lineWidth(2);
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1e40af")
          .text(
            resident.nameGivenByOrganization || resident.name || "N/A",
            50,
            yPosition + 8
          );
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#6b7280")
          .text(
            `Registration: ${resident.registrationNo || "N/A"}`,
            50,
            yPosition + 25
          )
          .text(
            `Age: ${resident.age || "N/A"} | Gender: ${
              resident.gender || "N/A"
            }`,
            50,
            yPosition + 40
          )
          .text(
            `Medical Report Generated: ${new Date().toLocaleDateString(
              "en-IN"
            )}`,
            50,
            yPosition + 55
          );

        yPosition = 220;
        yPosition = addSectionHeader("HEALTH INFORMATION", yPosition);
        yPosition = addField("Health Status", resident.healthStatus, yPosition);
        yPosition = addFieldPair("Blood Group", resident.bloodGroup, "Weight (kg)", resident.weight?.toString(), yPosition);
        yPosition = addFieldPair("Height (cm)", resident.height?.toString(), "Disability", resident.disabilityStatus, yPosition);
        
        yPosition = addSectionHeader("MEDICAL CONDITIONS", yPosition);
        yPosition = addField("Medical Conditions", resident.medicalConditions, yPosition, true);
        yPosition = addField("Allergies", resident.allergies, yPosition, true);
        yPosition = addField("Current Medications", resident.medications, yPosition, true);
        yPosition = addField(
          "Documents",
          resident.documentIds && resident.documentIds.length > 0
            ? resident.documentIds.map((doc) => doc.name).join(", ")
            : "None",
          yPosition,
          true
        );

        doc.end();
      } else {
        // DETAILED TEMPLATE
        doc.rect(40, 110, 520, 35).fillAndStroke(lightGreen, primaryGreen);
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text("DETAILED REGISTRATION REPORT", 40, 120, {
            align: "center",
            width: 520,
          });

        let yPosition = 160;
        doc
          .rect(30, yPosition, 540, 80)
          .fillAndStroke("#FFFFFF", primaryGreen)
          .lineWidth(2);
        doc
          .fontSize(18)
          .font("Helvetica-Bold")
          .fillColor(primaryGreen)
          .text(
            resident.nameGivenByOrganization || resident.name || "N/A",
            45,
            yPosition + 15
          );
        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor(lightGray)
          .text(
            `Registration No: ${resident.registrationNo || "N/A"}`,
            45,
            yPosition + 35
          )
          .text(
            `Admission Date: ${
              resident.admissionDate
                ? new Date(resident.admissionDate).toLocaleDateString("en-IN")
                : "N/A"
            }`,
            45,
            yPosition + 50
          );
        doc
          .text(
            `Age: ${resident.age || "N/A"} years | Gender: ${
              resident.gender || "N/A"
            }`,
            300,
            yPosition + 35
          )
          .text(`Category: ${resident.category || "N/A"}`, 300, yPosition + 50);

        yPosition = 260;

        // PHOTOS SECTION
        yPosition = addSectionHeader("RESIDENT PHOTOS", yPosition);
        yPosition = await addPhotos(yPosition);

        // PERSONAL INFORMATION
        yPosition = addSectionHeader("PERSONAL INFORMATION", yPosition);
        yPosition = addFieldPair("Full Name", resident.name, "Organization Name", resident.nameGivenByOrganization, yPosition);
        yPosition = addFieldPair(
          "Date of Birth",
          resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString("en-IN") : "N/A",
          "Gender",
          resident.gender,
          yPosition
        );
        yPosition = addFieldPair("Age", resident.age?.toString(), "Religion", resident.religion, yPosition);
        yPosition = addFieldPair("Category", resident.category, "Identification Mark", resident.identificationMark, yPosition);
        yPosition = addFieldPair("Voter ID", resident.voterId, "Aadhaar Number", resident.aadhaarNumber, yPosition);

        // CONTACT INFORMATION
        yPosition = addSectionHeader("CONTACT INFORMATION", yPosition);
        yPosition = addFieldPair("Mobile Number", resident.mobileNo, "Phone Number", resident.phoneNumber, yPosition);
        yPosition = addFieldPair("Alternative Contact", resident.alternativeContact, "Email Address", resident.emailAddress, yPosition);
        yPosition = addField("Social Media Handle", resident.socialMediaHandle, yPosition);

        // ADDRESS INFORMATION
        yPosition = addSectionHeader("ADDRESS INFORMATION", yPosition);
        yPosition = addField("Full Address", resident.address?.fullAddress, yPosition, true);
        yPosition = addFieldPair("City", resident.address?.city, "District", resident.address?.district, yPosition);
        yPosition = addFieldPair("State", resident.address?.state, "PIN Code", resident.address?.pincode, yPosition);
        yPosition = addFieldPair("Country", resident.address?.country, "Nearest Landmark", resident.nearestLandmark, yPosition);
        yPosition = addField("Alternative Address", resident.alternativeAddress, yPosition, true);
        yPosition = addFieldPair(
          "Latitude",
          resident.address?.latitude?.toString(),
          "Longitude",
          resident.address?.longitude?.toString(),
          yPosition
        );
        yPosition = addField("Distance from Facility (km)", resident.distanceFromFacility?.toString(), yPosition);

        // GUARDIAN INFORMATION
        yPosition = addSectionHeader("GUARDIAN INFORMATION", yPosition);
        yPosition = addFieldPair("Guardian Name", resident.guardianName, "Relation", resident.relationWith, yPosition);
        yPosition = addField("Admitted By Relative", resident.relativeAdmit, yPosition);

        // EMERGENCY CONTACT
        yPosition = addSectionHeader("EMERGENCY CONTACT", yPosition);
        yPosition = addFieldPair("Contact Name", resident.emergencyContactName, "Contact Number", resident.emergencyContactNumber, yPosition);
        yPosition = addField("Relationship", resident.emergencyContactRelationship, yPosition);

        // HEALTH INFORMATION
        yPosition = addSectionHeader("HEALTH INFORMATION", yPosition);
        yPosition = addFieldPair("Health Status", resident.healthStatus, "Blood Group", resident.bloodGroup, yPosition);
        yPosition = addFieldPair("Weight (kg)", resident.weight?.toString(), "Height (cm)", resident.height?.toString(), yPosition);
        yPosition = addFieldPair("Body Temperature (°C)", resident.bodyTemperature?.toString(), "Heart Rate (bpm)", resident.heartRate?.toString(), yPosition);
        yPosition = addFieldPair("Respiratory Rate", resident.respiratoryRate?.toString(), "Blood Pressure", resident.bloodPressure, yPosition);
        yPosition = addFieldPair("Disability Status", resident.disabilityStatus, "Disability Details", resident.disabilityDetails, yPosition);

        // MEDICAL DETAILS
        yPosition = addSectionHeader("MEDICAL DETAILS", yPosition);
        yPosition = addField("Medical Conditions", resident.medicalConditions, yPosition, true);
        yPosition = addField("Allergies", resident.allergies, yPosition, true);
        yPosition = addField("Known Allergies", resident.knownAllergies, yPosition, true);
        yPosition = addField("Current Medications", resident.medications, yPosition, true);
        yPosition = addFieldPair("Primary Doctor", resident.primaryDoctor, "Preferred Hospital", resident.preferredHospital, yPosition);
        yPosition = addField("Medical History", resident.medicalHistory, yPosition, true);
        yPosition = addField("Medical History Notes", resident.medicalHistoryNotes, yPosition, true);

        // INFORMER INFORMATION
        yPosition = addSectionHeader("INFORMER INFORMATION", yPosition);
        yPosition = addFieldPair("Informer Name", resident.informerName, "Informer Mobile", resident.informerMobile, yPosition);
        yPosition = addFieldPair(
          "Relationship",
          resident.informerRelationship,
          "Information Date",
          resident.informationDate ? new Date(resident.informationDate).toLocaleDateString("en-IN") : "N/A",
          yPosition
        );
        yPosition = addField("Informer Address", resident.informerAddress, yPosition, true);
        yPosition = addField("Information Details", resident.informationDetails, yPosition, true);

        // TRANSPORT INFORMATION
        yPosition = addSectionHeader("TRANSPORT INFORMATION", yPosition);
        yPosition = addFieldPair("Vehicle Number", resident.conveyanceVehicleNo, "Driver Name", resident.driverName, yPosition);
        yPosition = addFieldPair("Driver Mobile", resident.driverMobile, "Pick Up Place", resident.pickUpPlace, yPosition);
        yPosition = addFieldPair(
          "Pick Up Time",
          resident.pickUpTime ? new Date(resident.pickUpTime).toLocaleString("en-IN") : "N/A",
          "Transport Time",
          resident.transportTime,
          yPosition
        );
        yPosition = addField("Entrant Name", resident.entrantName, yPosition);
        yPosition = addField("Transport Notes", resident.transportNotes, yPosition, true);

        // ADMINISTRATIVE INFORMATION
        yPosition = addSectionHeader("ADMINISTRATIVE INFORMATION", yPosition);
        yPosition = addFieldPair("Registration Number", resident.registrationNo, "Admission Date", resident.admissionDate ? new Date(resident.admissionDate).toLocaleDateString("en-IN") : "N/A", yPosition);
        yPosition = addFieldPair("Admission Status", resident.admissionStatus, "Ward", resident.ward, yPosition);
        yPosition = addFieldPair("Rehabilitation Status", resident.rehabStatus, "Admitted By", resident.admittedBy, yPosition);
        yPosition = addFieldPair("Organization ID", resident.organizationId, "Priority Level", resident.priorityLevel, yPosition);
        yPosition = addFieldPair("Receipt No", resident.receiptNo, "Letter No", resident.letterNo, yPosition);

        // FINANCIAL INFORMATION
        yPosition = addSectionHeader("FINANCIAL INFORMATION", yPosition);
        yPosition = addField("Item Description", resident.itemDescription, yPosition, true);
        yPosition = addField("Item Amount (₹)", resident.itemAmount?.toString(), yPosition);

        // NOTES AND COMMENTS
        yPosition = addSectionHeader("NOTES AND COMMENTS", yPosition);
        yPosition = addField("Comments", resident.comments, yPosition, true);
        yPosition = addField("General Comments", resident.generalComments, yPosition, true);
        yPosition = addField("Medical Notes", resident.medicalNotes, yPosition, true);
        yPosition = addField("Behavioral Notes", resident.behavioralNotes, yPosition, true);
        yPosition = addField("Care Instructions", resident.careInstructions, yPosition, true);

        // UPDATE TRACKING
        yPosition = addSectionHeader("UPDATE TRACKING", yPosition);
        yPosition = addField("Update Summary", resident.updateSummary, yPosition, true);
        yPosition = addFieldPair("Updated By", resident.updatedBy, "Last Update Date", resident.lastUpdateDate ? new Date(resident.lastUpdateDate).toLocaleString("en-IN") : "N/A", yPosition);
        yPosition = addFieldPair(
          "Created At",
          resident.createdAt ? new Date(resident.createdAt).toLocaleString("en-IN") : "N/A",
          "Updated At",
          resident.updatedAt ? new Date(resident.updatedAt).toLocaleString("en-IN") : "N/A",
          yPosition
        );
        yPosition = addField("Is Active", resident.isActive ? "Yes" : "No", yPosition);

        // MEDIA INFORMATION
        yPosition = addSectionHeader("MEDIA INFORMATION", yPosition);
        yPosition = addField("Video URL", resident.videoUrl, yPosition, true);
        yPosition = addFieldPair(
          "Photo Before Admission",
          resident.photoBeforeAdmission ? "Available" : "Not Available",
          "Photo After Admission",
          resident.photoAfterAdmission ? "Available" : "Not Available",
          yPosition
        );

        // DOCUMENTS
        yPosition = addSectionHeader("DOCUMENTS", yPosition);
        if (resident.documentIds && resident.documentIds.length > 0) {
          // First show the document list
          const docList = resident.documentIds.map((doc, idx) =>
            `${idx + 1}. ${doc.name || 'Document'} ${doc.type ? `(${doc.type})` : ''} (${doc.mimeType})`
          ).join(", ");
          yPosition = addField("Uploaded Documents", docList, yPosition, true);

          // Then try to embed document content
          for (const document of resident.documentIds) {
            yPosition = checkPageBreak(yPosition, 200);

            // Document header
            doc
              .rect(40, yPosition, 520, 25)
              .fillAndStroke("#fef3c7", "#f59e0b")
              .lineWidth(1);
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#92400e")
              .text(`${document.name || 'Document'} (${document.type || 'Unknown'})`, 50, yPosition + 8);
            yPosition += 30;

            try {
              // Download the document
              const documentBuffer = await downloadImage(document.filePath);

              if (document.mimeType.startsWith('image/')) {
                // For images, embed them in the PDF
                yPosition = checkPageBreak(yPosition, 200);
                doc.image(documentBuffer, 60, yPosition, {
                  fit: [480, 180],
                  align: 'center'
                });
                yPosition += 190;
              } else if (document.mimeType === 'application/pdf') {
                // For PDFs, add a note that PDF content is attached
                yPosition = addField("PDF Document", "PDF document available - content embedded separately", yPosition, true);
                // Note: Merging PDFs would require additional libraries like pdf-lib
              } else {
                // For other document types
                yPosition = addField("Document Content", `Document of type ${document.mimeType} is available but cannot be displayed inline`, yPosition, true);
              }
            } catch (err) {
              console.log(`Error loading document ${document.name}:`, err);
              yPosition = addField("Document Status", "Document unavailable", yPosition, true);
            }

            yPosition += 10; // Add some space between documents
          }
        } else {
          yPosition = addField("Uploaded Documents", "No documents uploaded", yPosition, true);
        }

        // CARE EVENTS
        if (resident.careEvents && resident.careEvents.length > 0) {
          yPosition = addSectionHeader("CARE EVENTS HISTORY", yPosition);
          
          resident.careEvents.forEach((event, index) => {
            yPosition = checkPageBreak(yPosition, 150);
            
            // Event header
            doc
              .rect(40, yPosition, 520, 25)
              .fillAndStroke("#f0f9ff", "#3b82f6")
              .lineWidth(1);
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#1e40af")
              .text(`Event ${index + 1}: ${event.type || 'General Care'}`, 50, yPosition + 8);
            
            yPosition += 30;
            
            yPosition = addField("Description", event.description, yPosition, true);
            yPosition = addFieldPair(
              "Date",
              event.date ? new Date(event.date).toLocaleDateString("en-IN") : "N/A",
              "Doctor",
              event.doctor,
              yPosition
            );
            yPosition = addField("Medications", event.medications, yPosition, true);
            yPosition = addFieldPair(
              "Next Visit",
              event.nextVisit ? new Date(event.nextVisit).toLocaleDateString("en-IN") : "N/A",
              "Status",
              event.status,
              yPosition
            );
            yPosition = addField("Remarks", event.remarks, yPosition, true);
            yPosition = addFieldPair(
              "Created By",
              event.createdBy,
              "Created At",
              event.createdAt ? new Date(event.createdAt).toLocaleString("en-IN") : "N/A",
              yPosition
            );
            
            yPosition += 10;
          });
        }

        // Add page numbers to all pages (only if there are actual pages with content)
        const pages = doc.bufferedPageRange();
        const totalPages = pages.count;

        // Only add footers if there are pages with content
        if (totalPages > 0) {
          for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);

            // Footer
            const footerY = doc.page.height - 60;
            doc
              .rect(0, footerY, doc.page.width, 60)
              .fillAndStroke(lightGreen, primaryGreen);
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(primaryGreen)
              .text(
                "Gharpan Organization - Residential Care & Rehabilitation Center",
                40,
                footerY + 15,
                { width: 520, align: 'center' }
              )
              .fontSize(8)
              .font("Helvetica")
              .text(
                `Page ${i + 1} of ${totalPages} | Generated: ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}`,
                40,
                footerY + 35,
                { width: 520, align: 'center' }
              );
          }
        }

        doc.end();
      }
    } else if (format === "excel") {
      const excelData = [
        {
          "Registration No": resident.registrationNo || "N/A",
          "Admission Date": resident.admissionDate
            ? new Date(resident.admissionDate).toLocaleDateString("en-IN")
            : "N/A",
          "Full Name": resident.name || "N/A",
          "Organization Name": resident.nameGivenByOrganization || "N/A",
          "Date of Birth": resident.dateOfBirth
            ? new Date(resident.dateOfBirth).toLocaleDateString("en-IN")
            : "N/A",
          Gender: resident.gender || "N/A",
          Age: resident.age || "N/A",
          "Mobile Number": resident.mobileNo || "N/A",
          Address: resident.address
            ? `${resident.address.fullAddress || ""}, ${
                resident.address.district || ""
              }, ${resident.address.state || ""}, ${
                resident.address.country || ""
              }`.replace(/^,\s*|,\s*$/g, "")
            : "N/A",
          "Guardian Name": resident.guardianName || "N/A",
          Relation: resident.relationWith || "N/A",
          "Admitted By": resident.relativeAdmit || "N/A",
          "Health Status": resident.healthStatus || "N/A",
          "Blood Group": resident.bloodGroup || "N/A",
          "Weight (kg)": resident.weight || "N/A",
          "Height (cm)": resident.height || "N/A",
          "Disability Status": resident.disabilityStatus || "N/A",
          "Medical Conditions": resident.medicalConditions || "N/A",
          Allergies: resident.allergies || "N/A",
          Medications: resident.medications || "N/A",
          Category: resident.category || "N/A",
          "Rehabilitation Status": resident.rehabStatus || "N/A",
          "Voter ID": resident.voterId || "N/A",
          "Aadhaar Number": resident.aadhaarNumber || "N/A",
          Religion: resident.religion || "N/A",
          "Identification Mark": resident.identificationMark || "N/A",
          Ward: resident.ward || "N/A",
          Documents: resident.documentIds
            ? resident.documentIds.map((doc) => doc.name).join(", ")
            : "N/A",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wscols = [
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 8 },
        { wch: 15 },
        { wch: 40 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 8 },
        { wch: 8 },
        { wch: 15 },
        { wch: 30 },
        { wch: 30 },
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 12 },
        { wch: 30 },
      ];
      ws["!cols"] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, "Resident Details");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      const filename = `resident_${
        resident.registrationNo || resident._id
      }_${template}_${new Date().toISOString().split("T")[0]}.xlsx`;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Length", excelBuffer.length);
      res.send(excelBuffer);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format specified. Use "pdf" or "excel".',
      });
    }
  } catch (error) {
    console.error("Error downloading resident details:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error downloading resident details",
      error: error.message,
    });
  }
});

// GET /api/residents/:id/print
router.get("/:id/print", async (req, res) => {
  try {
    const { id } = req.params;
    const resident = await Resident.findById(id).populate("documentIds");
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      info: {
        Title: `Resident Print - ${resident.registrationNo || resident._id}`,
        Author: "Gharpan Organization",
        Subject: "Resident Registration Details for Printing",
        Keywords: "resident, registration, details, gharpan, print",
      },
    });

    const primaryGreen = "#0A400C";
    const lightGreen = "#E8F5E8";
    const creamBackground = "#FEFCF2";
    const darkGray = "#374151";
    const lightGray = "#6B7280";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=resident-${
        resident.registrationNo || resident._id
      }-print.pdf`
    );
    doc.pipe(res);

    const addField = (
      label,
      value,
      yPos,
      isMultiline = false,
      leftColumn = true
    ) => {
      const xPos = leftColumn ? 40 : 320;
      const fieldWidth = leftColumn ? 250 : 250;
      doc
        .rect(xPos - 10, yPos - 2, fieldWidth + 20, isMultiline ? 35 : 18)
        .fillAndStroke(creamBackground, "#E5E7EB")
        .lineWidth(0.5);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(primaryGreen)
        .text(label + ":", xPos, yPos, { width: 100 });
      doc.font("Helvetica").fillColor(darkGray);
      if (isMultiline && value && value.length > 35) {
        doc.text(value || "N/A", xPos, yPos + 12, {
          width: fieldWidth - 10,
          align: "left",
        });
        return yPos + Math.ceil((value || "N/A").length / 40) * 10 + 25;
      } else {
        doc.text(value || "N/A", xPos + 110, yPos, { width: fieldWidth - 110 });
        return yPos + (isMultiline ? 25 : 20);
      }
    };

    const addSectionHeader = (title, yPos, icon = "") => {
      doc
        .rect(30, yPos - 8, 540, 28)
        .fillAndStroke(lightGreen, primaryGreen)
        .lineWidth(2);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(primaryGreen)
        .text(`${icon} ${title}`, 45, yPos + 2);
      return yPos + 35;
    };

    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fillAndStroke("#FFFFFF", "#FFFFFF");
    doc
      .rect(0, 0, doc.page.width, 100)
      .fillAndStroke(primaryGreen, primaryGreen);
    doc
      .rect(40, 15, 70, 70)
      .fillAndStroke("#FFFFFF", primaryGreen)
      .lineWidth(3);

    // Try to load the logo image
    try {
      let logoPath;

      // Try multiple possible paths for different environments
      const possiblePaths = [
        path.join(__dirname, 'public/image1.jpg'), // Logo in backend public directory
        path.join(__dirname, '../frontend/src/images/image1.jpg'), // Local development
        path.join(__dirname, '../../frontend/src/images/image1.jpg'), // Some deployment structures
        path.join(__dirname, 'logo.jpg'), // Logo in backend directory
        path.join(process.cwd(), 'frontend/src/images/image1.jpg'), // From project root
        path.join(process.cwd(), 'logo.jpg'), // Logo in project root
      ];

      // Find the first existing path
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          logoPath = testPath;
          break;
        }
      }

      if (!logoPath) {
        throw new Error('Logo file not found in any expected location');
      }

      const logoBuffer = fs.readFileSync(logoPath);
      doc.image(logoBuffer, 45, 20, {
        fit: [60, 60],
        align: 'center',
        valign: 'center'
      });
    } catch (err) {
      console.log("Error loading logo:", err.message);
      // Fallback to text if logo can't be loaded
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(primaryGreen)
        .text("GHARPAN", 55, 40)
        .text("LOGO", 60, 55);
    }
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text("Gharpan Dashboard", 130, 20);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#E0F2E0")
      .text("Residential Care & Rehabilitation Center", 130, 45)
      .text("Registration & Documentation System", 130, 60);
    doc
      .fontSize(8)
      .fillColor("#E0F2E0")
      .text(
        `Generated for Printing: ${new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        400,
        75
      );

    doc.rect(40, 110, 520, 35).fillAndStroke(lightGreen, primaryGreen);
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(primaryGreen)
      .text("RESIDENT PRINT DOCUMENT", 40, 120, {
        align: "center",
        width: 520,
      });

    let yPosition = 160;
    doc
      .rect(30, yPosition, 540, 80)
      .fillAndStroke("#FFFFFF", primaryGreen)
      .lineWidth(2);
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(primaryGreen)
      .text(
        resident.nameGivenByOrganization || resident.name || "N/A",
        45,
        yPosition + 15
      );
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(lightGray)
      .text(
        `Registration No: ${resident.registrationNo || "N/A"}`,
        45,
        yPosition + 35
      )
      .text(
        `Admission Date: ${
          resident.admissionDate
            ? new Date(resident.admissionDate).toLocaleDateString("en-IN")
            : "N/A"
        }`,
        45,
        yPosition + 50
      );
    doc
      .text(
        `Age: ${resident.age || "N/A"} years | Gender: ${
          resident.gender || "N/A"
        }`,
        300,
        yPosition + 35
      )
      .text(`Category: ${resident.category || "N/A"}`, 300, yPosition + 50);

    yPosition = 260;

    // Compact sections for print
    // FIX: Removed emojis from section headers
    yPosition = addSectionHeader("PERSONAL INFO", yPosition);
    let currentY = yPosition;
    currentY = addField("Name", resident.name, currentY, false, true);
    currentY = addField(
      "DOB",
      resident.dateOfBirth
        ? new Date(resident.dateOfBirth).toLocaleDateString("en-IN")
        : "N/A",
      currentY - 18,
      false,
      false
    );
    currentY = addField("Gender", resident.gender, currentY, false, true);
    currentY = addField(
      "Age",
      resident.age?.toString(),
      currentY - 18,
      false,
      false
    );
    currentY = addField("Religion", resident.religion, currentY, false, true);
    currentY = addField(
      "Category",
      resident.category,
      currentY - 18,
      false,
      false
    );
    yPosition = Math.max(currentY, yPosition + 70);
    
    // FIX: Removed emojis from section headers
    yPosition = addSectionHeader("CONTACT", yPosition);
    currentY = yPosition;
    currentY = addField("Mobile", resident.mobileNo, currentY, false, true);
    currentY = addField("State", resident.state, currentY - 18, false, false);
    currentY = addField("District", resident.district, currentY, false, true);
    currentY = addField(
      "Address",
      resident.fullAddress,
      currentY - 18,
      true,
      false
    );
    yPosition = Math.max(currentY, yPosition + 60);

    // FIX: Removed emojis from section headers
    yPosition = addSectionHeader("GUARDIAN", yPosition);
    currentY = yPosition;
    currentY = addField(
      "Guardian",
      resident.guardianName,
      currentY,
      false,
      true
    );
    currentY = addField(
      "Relation",
      resident.relationWith,
      currentY - 18,
      false,
      false
    );
    currentY = addField(
      "Contact",
      resident.guardianContact,
      currentY,
      false,
      true
    );
    yPosition = Math.max(currentY, yPosition + 50);

    // FIX: Removed emojis from section headers
    yPosition = addSectionHeader("HEALTH", yPosition);
    currentY = yPosition;
    currentY = addField("Status", resident.healthStatus, currentY, false, true);
    currentY = addField(
      "Blood Group",
      resident.bloodGroup,
      currentY - 18,
      false,
      false
    );
    currentY = addField(
      "Weight",
      resident.weight?.toString(),
      currentY,
      false,
      true
    );
    currentY = addField(
      "Height",
      resident.height?.toString(),
      currentY - 18,
      false,
      false
    );
    if (resident.medicalConditions) {
      currentY = addField(
        "Medical Conditions",
        resident.medicalConditions,
        currentY,
        true,
        true
      );
    }
    yPosition = Math.max(currentY, yPosition + 80);

    // Footer
    const footerY = doc.page.height - 40;
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(lightGray)
      .text(
        `Generated: ${new Date().toLocaleString("en-IN")} | Page 1`,
        20,
        footerY,
        { align: "center", width: 550 }
      );

    doc.end();
  } catch (error) {
    console.error("Error generating print PDF:", error);
    res.status(500).json({
      success: false,
      message: "Error generating print PDF",
      error: error.message,
    });
  }
});

// ==================== CARE EVENTS ENDPOINTS ====================

// GET: Fetch care events for a specific resident
router.get("/:id/care-events", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID format",
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    // Sort care events by date (most recent first)
    const careEvents = resident.careEvents
      ? resident.careEvents.sort((a, b) => new Date(b.date) - new Date(a.date))
      : [];

    res.json({
      success: true,
      data: careEvents,
      count: careEvents.length,
    });
  } catch (error) {
    console.error("Error fetching care events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch care events",
      error: error.message,
    });
  }
});

// POST: Add a new care event for a specific resident
router.post("/:id/care-events", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, date, doctor, medications, nextVisit, status } =
      req.body;

    console.log("POST care-events request received:", {
      residentId: id,
      body: req.body,
      type,
      description,
      date,
      doctor,
      medications,
      nextVisit,
      status,
    });

    if (!isValidObjectId(id)) {
      console.log("Invalid resident ID:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID format",
      });
    }

    // Validate required fields
    if (!type || !description || !date) {
      console.log("Missing required fields:", { type, description, date });
      return res.status(400).json({
        success: false,
        message: "Type, description, and date are required fields",
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      console.log("Resident not found:", id);
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    console.log(
      "Found resident:",
      resident.name || resident.nameGivenByOrganization
    );

    // Create new care event with proper data sanitization
    const newCareEvent = {
      type: String(type).trim(),
      description: String(description).trim(),
      date: new Date(date),
      doctor: doctor ? String(doctor).trim() : "",
      medications: medications ? String(medications).trim() : "",
      nextVisit: nextVisit ? new Date(nextVisit) : null,
      status: status ? String(status).trim() : "Completed",
      createdAt: new Date(),
      createdBy: "Admin", // You can modify this to use actual user info
    };

    console.log("Creating care event:", newCareEvent);

    // Add to resident's care events array
    if (!resident.careEvents) {
      resident.careEvents = [];
    }
    resident.careEvents.push(newCareEvent);

    console.log(
      "About to save resident with care events count:",
      resident.careEvents.length
    );

    // Save the resident
    await resident.save();

    console.log("Resident saved successfully");

    // Get the newly added event (with its generated _id)
    const addedEvent = resident.careEvents[resident.careEvents.length - 1];

    console.log("Returning added event:", addedEvent);

    res.status(201).json({
      success: true,
      message: "Care event added successfully",
      data: addedEvent,
    });
  } catch (error) {
    console.error("Error adding care event:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to add care event",
      error: error.message,
    });
  }
});

// PUT: Update a specific care event
router.put("/:id/care-events/:eventId", async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const { type, description, date, doctor, medications, nextVisit, status } =
      req.body;

    console.log("PUT care event request:", {
      residentId: id,
      eventId,
      body: req.body,
    });

    if (!isValidObjectId(id) || !isValidObjectId(eventId)) {
      console.log("Invalid ID format:", { id, eventId });
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      console.log("Resident not found:", id);
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    console.log(
      "Found resident:",
      resident.name || resident.nameGivenByOrganization
    );

    // Find the care event to update using findIndex
    const careEventIndex = resident.careEvents.findIndex(
      (event) => event._id.toString() === eventId
    );

    if (careEventIndex === -1) {
      console.log("Care event not found:", eventId);
      return res.status(404).json({
        success: false,
        message: "Care event not found",
      });
    }

    console.log("Found care event at index:", careEventIndex);
    const careEvent = resident.careEvents[careEventIndex];

    // Update the care event with proper data sanitization
    if (type) careEvent.type = String(type).trim();
    if (description) careEvent.description = String(description).trim();
    if (date) careEvent.date = new Date(date);
    if (doctor !== undefined) careEvent.doctor = String(doctor).trim();
    if (medications !== undefined)
      careEvent.medications = String(medications).trim();
    if (nextVisit) careEvent.nextVisit = new Date(nextVisit);
    if (status) careEvent.status = String(status).trim();

    console.log("Updated care event data:", {
      type: careEvent.type,
      description: careEvent.description,
      date: careEvent.date,
      doctor: careEvent.doctor,
      medications: careEvent.medications,
      nextVisit: careEvent.nextVisit,
      status: careEvent.status,
    });

    await resident.save();
    console.log("Care event updated successfully");

    res.json({
      success: true,
      message: "Care event updated successfully",
      data: careEvent,
    });
  } catch (error) {
    console.error("Error updating care event:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to update care event",
      error: error.message,
    });
  }
});

// DELETE: Remove a specific care event
router.delete("/:id/care-events/:eventId", async (req, res) => {
  try {
    const { id, eventId } = req.params;

    console.log("DELETE care event request:", { residentId: id, eventId });

    if (!isValidObjectId(id) || !isValidObjectId(eventId)) {
      console.log("Invalid ID format:", { id, eventId });
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      console.log("Resident not found:", id);
      return res.status(404).json({
        success: false,
        message: "Resident not found",
      });
    }

    console.log(
      "Found resident:",
      resident.name || resident.nameGivenByOrganization
    );
    console.log(
      "Care events count before deletion:",
      resident.careEvents.length
    );

    // Find the care event index
    const careEventIndex = resident.careEvents.findIndex(
      (event) => event._id.toString() === eventId
    );

    if (careEventIndex === -1) {
      console.log("Care event not found:", eventId);
      return res.status(404).json({
        success: false,
        message: "Care event not found",
      });
    }

    console.log("Found care event at index:", careEventIndex);

    // Remove the care event using splice
    const removedEvent = resident.careEvents.splice(careEventIndex, 1)[0];
    console.log("Removed event:", removedEvent.type, removedEvent.description);

    await resident.save();

    console.log(
      "Care events count after deletion:",
      resident.careEvents.length
    );

    res.json({
      success: true,
      message: "Care event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting care event:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to delete care event",
      error: error.message,
    });
  }
});

module.exports = router;