import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import FormField from "./FormField";
import FormSteps from "./FormSteps";
import { useToast, ToastContainer } from "./Toast";
import {
  validateForm,
  validateField,
  registrationFormRules,
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
} from "../utils/validation";

function RegistrationForm() {
  const [animate, setAnimate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [searchParams] = useSearchParams();
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [residentId, setResidentId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const { toasts, showSuccess, showError, showWarning, showInfo, removeToast } =
    useToast();

  // Form steps configuration
  const formSteps = [
    { id: "basic", label: "Basic Info" },
    { id: "contact", label: "Contact" },
    { id: "health", label: "Health" },
    { id: "admin", label: "Admin" },
    { id: "documents", label: "Documents" },
    { id: "review", label: "Review & Submit" },
  ];

  // Form data state with proper photo field handling
  const [formData, setFormData] = useState({
    registrationNo: "",
    admissionDate: "",
    name: "",
    nameGivenByOrganization: "",
    dateOfBirth: "",
    gender: "",
    age: "",
    weight: "",
    height: "",
    religion: "",
    identificationMark: "",
    state: "",
    district: "",
    country: "India",
    fullAddress: "",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
    alternativeAddress: "",
    nearestLandmark: "",
    distanceFromFacility: "",
    relativeAdmit: "",
    relationWith: "",
    guardianName: "",
    mobileNo: "",
    phoneNumber: "",
    alternativeContact: "",
    emailAddress: "",
    socialMediaHandle: "",
    voterId: "",
    aadhaarNumber: "",
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactNumber: "",
    emergencyContactRelationship: "",
    // Health Information
    healthStatus: "",
    category: "",
    bloodGroup: "",
    allergies: "",
    knownAllergies: "",
    medicalConditions: "",
    disabilityStatus: "",
    disabilityDetails: "",
    medications: "",
    rehabStatus: "",
    // Vital Signs
    bodyTemperature: "",
    heartRate: "",
    respiratoryRate: "",
    bloodPressure: "",
    // Additional Health
    primaryDoctor: "",
    preferredHospital: "",
    medicalHistoryNotes: "",
    medicalHistory: "",
    // Comments
    comments: "",
    generalComments: "",
    medicalNotes: "",
    behavioralNotes: "",
    careInstructions: "",
    priorityLevel: "",
    updateSummary: "",
    updatedBy: "",
    lastUpdateDate: "",
    // Informer Information
    informerName: "",
    informerMobile: "",
    informerRelationship: "",
    informationDate: "",
    informerAddress: "",
    informationDetails: "",
    // Transport Information
    conveyanceVehicleNo: "",
    pickUpPlace: "",
    pickUpTime: "",
    entrantName: "",
    driverName: "",
    driverMobile: "",
    transportTime: "",
    transportNotes: "",
    admittedBy: "",
    organizationId: "",
    admissionStatus: "",
    ward: "",
    receiptNo: "",
    letterNo: "",
    itemDescription: "",
    itemAmount: "",
    videoUrl: "",
    // Photo fields
    photoBeforeAdmission: null,
    photoAfterAdmission: null,
    photo: null, // Keep for backward compatibility
    documents: [],
    confirmDetails: false,
  });

  useEffect(() => {
    setAnimate(true);

    // Check if we're in update mode
    const updateId = searchParams.get("update");
    if (updateId) {
      setIsUpdateMode(true);
      setResidentId(updateId);
      fetchResidentData(updateId);
    } else {
      // Load draft if available (only for new registrations)
      const draft = loadFormDraft();
      if (draft && !isDraftLoaded) {
        setFormData((prevData) => ({
          ...prevData,
          ...draft,
          documents: draft.documents || [],
        }));
        setIsDraftLoaded(true);
        setLastSaved(draft.lastSaved);
        showInfo(
          "Previous draft loaded. You can continue where you left off.",
          6000
        );
      }
    }
  }, [searchParams, isDraftLoaded]);

  // Fetch resident data for update with all fields
  const fetchResidentData = async (id) => {
    try {
      const response = await fetch(`/api/residents/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const residentData = result.data;
        
        // Populate form with all existing data including photos
        setFormData((prevData) => ({
          ...prevData,
          // Basic Information
          registrationNo: residentData.registrationNo || "",
          admissionDate: residentData.admissionDate ? residentData.admissionDate.split('T')[0] : "",
          name: residentData.name || "",
          nameGivenByOrganization: residentData.nameGivenByOrganization || "",
          dateOfBirth: residentData.dateOfBirth ? residentData.dateOfBirth.split('T')[0] : "",
          gender: residentData.gender || "",
          age: residentData.age || "",
          weight: residentData.weight || "",
          height: residentData.height || "",
          religion: residentData.religion || "",
          identificationMark: residentData.identificationMark || "",
          
          // Address Information
          state: residentData.address?.state || "",
          district: residentData.address?.district || "",
          country: residentData.address?.country || "India",
          fullAddress: residentData.address?.fullAddress || "",
          city: residentData.address?.city || "",
          pincode: residentData.address?.pincode || "",
          latitude: residentData.address?.latitude || "",
          longitude: residentData.address?.longitude || "",
          alternativeAddress: residentData.alternativeAddress || "",
          nearestLandmark: residentData.nearestLandmark || "",
          distanceFromFacility: residentData.distanceFromFacility || "",
          
          // Contact Information
          relativeAdmit: residentData.relativeAdmit || "",
          relationWith: residentData.relationWith || "",
          guardianName: residentData.guardianName || "",
          mobileNo: residentData.mobileNo || "",
          phoneNumber: residentData.phoneNumber || "",
          alternativeContact: residentData.alternativeContact || "",
          emailAddress: residentData.emailAddress || "",
          socialMediaHandle: residentData.socialMediaHandle || "",
          voterId: residentData.voterId || "",
          aadhaarNumber: residentData.aadhaarNumber || "",
          
          // Emergency Contact
          emergencyContactName: residentData.emergencyContactName || "",
          emergencyContactNumber: residentData.emergencyContactNumber || "",
          emergencyContactRelationship: residentData.emergencyContactRelationship || "",
          
          // Health Information
          healthStatus: residentData.healthStatus || "",
          category: residentData.category || "",
          bloodGroup: residentData.bloodGroup || "",
          allergies: residentData.allergies || "",
          knownAllergies: residentData.knownAllergies || "",
          medicalConditions: residentData.medicalConditions || "",
          disabilityStatus: residentData.disabilityStatus || "",
          disabilityDetails: residentData.disabilityDetails || "",
          medications: residentData.medications || "",
          rehabStatus: residentData.rehabStatus || "",
          
          // Vital Signs
          bodyTemperature: residentData.bodyTemperature || "",
          heartRate: residentData.heartRate || "",
          respiratoryRate: residentData.respiratoryRate || "",
          bloodPressure: residentData.bloodPressure || "",
          
          // Additional Health
          primaryDoctor: residentData.primaryDoctor || "",
          preferredHospital: residentData.preferredHospital || "",
          medicalHistoryNotes: residentData.medicalHistoryNotes || "",
          medicalHistory: residentData.medicalHistory || "",
          
          // Comments
          comments: residentData.comments || "",
          generalComments: residentData.generalComments || "",
          medicalNotes: residentData.medicalNotes || "",
          behavioralNotes: residentData.behavioralNotes || "",
          careInstructions: residentData.careInstructions || "",
          priorityLevel: residentData.priorityLevel || "",
          updateSummary: residentData.updateSummary || "",
          updatedBy: residentData.updatedBy || "",
          lastUpdateDate: residentData.lastUpdateDate ? residentData.lastUpdateDate.split('T')[0] : "",
          
          // Informer Information
          informerName: residentData.informerName || "",
          informerMobile: residentData.informerMobile || "",
          informerRelationship: residentData.informerRelationship || "",
          informationDate: residentData.informationDate ? residentData.informationDate.split('T')[0] : "",
          informerAddress: residentData.informerAddress || "",
          informationDetails: residentData.informationDetails || "",
          
          // Transport Information
          conveyanceVehicleNo: residentData.conveyanceVehicleNo || "",
          pickUpPlace: residentData.pickUpPlace || "",
          pickUpTime: residentData.pickUpTime || "",
          entrantName: residentData.entrantName || "",
          driverName: residentData.driverName || "",
          driverMobile: residentData.driverMobile || "",
          transportTime: residentData.transportTime || "",
          transportNotes: residentData.transportNotes || "",
          admittedBy: residentData.admittedBy || "",
          organizationId: residentData.organizationId || "",
          admissionStatus: residentData.admissionStatus || "",
          ward: residentData.ward || "",
          receiptNo: residentData.receiptNo || "",
          letterNo: residentData.letterNo || "",
          itemDescription: residentData.itemDescription || "",
          itemAmount: residentData.itemAmount || "",
          videoUrl: residentData.videoUrl || "",
          
          // Handle existing photos (clear file fields for security)
          photoBeforeAdmission: null, // File input, not URL
          photoAfterAdmission: null,  // File input, not URL
          photo: null,
          documents: residentData.documents || [],
          
          // Store URLs for display purposes
          photoBeforeAdmissionUrl: residentData.photoBeforeAdmissionUrl,
          photoAfterAdmissionUrl: residentData.photoAfterAdmissionUrl,
        }));
      }
    } catch (error) {
      console.error("Error fetching resident data:", error);
      showError("Error loading resident data for update");
    }
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }

      const newDocument = {
        id: Date.now() + Math.random(), // Unique ID for each document
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        category: "", // Will be set by user
        description: "",
      };

      setFormData((prev) => ({
        ...prev,
        documents: [...prev.documents, newDocument],
      }));
    });

    // Clear the input
    e.target.value = "";
  };

  // Remove document
  const removeDocument = (documentId) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== documentId),
    }));
  };

  // Update document details
  const updateDocumentDetails = (documentId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.id === documentId ? { ...doc, [field]: value } : doc
      ),
    }));
  };

  // Handle input changes with validation and auto-save
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    let newFormData;
    if (type === "file") {
      // Handle multiple photo fields properly
      newFormData = {
        ...formData,
        [name]: files[0],
      };
    } else {
      newFormData = {
        ...formData,
        [name]: value,
      };
    }

    setFormData(newFormData);

    // Real-time validation (only format validation, not required)
    if (registrationFormRules[name]) {
      const validation = validateField(name, value, registrationFormRules);
      setFormErrors((prev) => ({
        ...prev,
        [name]: validation.isValid ? "" : validation.error,
      }));
    }

    // Auto-save draft (debounced)
    if (!isUpdateMode) {
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = setTimeout(() => {
        const saveResult = saveFormDraft(newFormData);
        if (saveResult.success) {
          setLastSaved(saveResult.timestamp);
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
  };

  // Validate current step
  const validateCurrentStep = () => {
    const stepFields = getStepFields(currentStep);
    const stepData = {};
    stepFields.forEach((field) => {
      stepData[field] = formData[field];
    });

    const stepRules = {};
    stepFields.forEach((field) => {
      if (registrationFormRules[field]) {
        stepRules[field] = registrationFormRules[field];
      }
    });

    const { isValid, errors } = validateForm(stepData, stepRules);
    setFormErrors((prev) => ({ ...prev, ...errors }));

    // Show warnings for format issues but don't block
    if (!isValid) {
      showWarning(
        "Some fields have format issues. Please check and correct them.",
        5000
      );
    }

    return isValid;
  };

  // Get fields for current step
  const getStepFields = (step) => {
    switch (step) {
      case 1:
        return [
          "registrationNo",
          "admissionDate",
          "name",
          "nameGivenByOrganization",
                    "dateOfBirth",
          "gender",
          "age",
        ];
      case 2:
        return ["fullAddress", "state", "district", "guardianName", "mobileNo"];
      case 3:
        return ["healthStatus", "bloodGroup", "allergies", "medicalConditions"];
      case 4:
        return ["ward", "admittedBy", "rehabStatus"];
      case 5:
        return ["photoBeforeAdmission", "photoAfterAdmission"];
      default:
        return [];
    }
  };

  // Handle step navigation
  const handleStepClick = (step) => {
    if (step <= currentStep || validateCurrentStep()) {
      setCurrentStep(step);
    } else {
      showWarning("Please fix any format issues before proceeding", 3000);
    }
  };

  const handleNextStep = () => {
    if (validateCurrentStep() || true) {
      // Allow progression even with warnings
      if (currentStep < formSteps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle submit with proper photo field handling
  async function handleSubmit(e) {
    e.preventDefault();

    // Validate entire form
    const { isValid, errors } = validateForm(formData, registrationFormRules);
    setFormErrors(errors);

    if (!isValid) {
      showError("Please fix all validation errors before submitting");
      return;
    }

    if (!formData.confirmDetails) {
      showError(
        "Please confirm that all details are accurate before submitting"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData with proper photo handling
      const submitData = new FormData();

      // Add all form fields except photos and documents
      Object.keys(formData).forEach((key) => {
        if (
          key !== "documents" &&
          key !== "photoBeforeAdmission" &&
          key !== "photoAfterAdmission" &&
          key !== "photo" &&
          formData[key] !== null &&
          formData[key] !== ""
        ) {
          submitData.append(key, formData[key]);
        }
      });

      // Handle both photo uploads
      if (formData.photoBeforeAdmission) {
        submitData.append("photoBeforeAdmission", formData.photoBeforeAdmission);
        console.log("Added photoBeforeAdmission:", formData.photoBeforeAdmission.name);
      }

      if (formData.photoAfterAdmission) {
        submitData.append("photoAfterAdmission", formData.photoAfterAdmission);
        console.log("Added photoAfterAdmission:", formData.photoAfterAdmission.name);
      }

      // Handle legacy photo field for backward compatibility
      if (formData.photo) {
        submitData.append("photo", formData.photo);
        console.log("Added legacy photo:", formData.photo.name);
      }

      console.log("Submitting resident data with fields:");
      for (let [key, value] of submitData.entries()) {
        console.log(`${key}:`, typeof value === 'object' ? value.name || 'File' : value);
      }

      const apiUrl = isUpdateMode 
        ? `/api/residents/${residentId}`
        : '/api/residents';
      const method = isUpdateMode ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        body: submitData,
      });

      const result = await response.json();
      console.log("Resident API response:", {
        status: response.status,
        result,
      });

      if (!result.success) {
        throw new Error(
          result.message ||
            (isUpdateMode ? "Update failed" : "Registration failed")
        );
      }

      const newResidentId = result.data._id;
      console.log("Resident created/updated with ID:", newResidentId);

      // Step 2: Upload documents if any
      let documentIds = [];
      if (formData.documents.length > 0) {
        for (const doc of formData.documents) {
          const documentFormData = new FormData();
          documentFormData.append("file", doc.file);
          documentFormData.append("residentId", newResidentId);
          documentFormData.append("name", doc.name);
          documentFormData.append("type", doc.category || "other");

          console.log(
            "Submitting document:",
            Array.from(documentFormData.entries())
          );

          const docResponse = await fetch('/api/documents/upload', {
            method: 'POST',
            body: documentFormData
          });

          const docResult = await docResponse.json();
          console.log("Document upload response:", {
            status: docResponse.status,
            docResult,
          });

          if (!docResponse.ok || !docResult.success) {
            console.error("Document upload failed:", docResult.message, {
              name: doc.name,
            });
            showError(
              `Failed to upload document: ${doc.name}. Error: ${
                docResult.message || "Unknown error"
              }`
            );
            continue; // Continue with other documents
          }

          documentIds.push(docResult.data._id);
        }

        // Update resident with document IDs (for new residents)
        if (documentIds.length > 0 && !isUpdateMode) {
          // Validate documentIds
          if (
            !documentIds.every(
              (id) => typeof id === "string" && id.length === 24
            )
          ) {
            console.error("Invalid documentIds:", documentIds);
            throw new Error("Invalid document IDs format");
          }
          console.log("Updating resident with documentIds:", documentIds);
          const updateResponse = await fetch(
            `/api/residents/${newResidentId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentIds }),
            }
          );
          const updateResult = await updateResponse.json();
          console.log("Resident update response:", {
            status: updateResponse.status,
            updateResult,
          });

          if (!updateResult.success) {
            throw new Error(
              updateResult.message || "Failed to link documents to resident"
            );
          }
        }
      }

      // Success handling
      const successMessage = isUpdateMode
        ? `Resident updated successfully! Registration No: ${
            result.data.registrationNo || "N/A"
          }`
        : `Registration successful! Registration No: ${
            result.data.registrationNo || "N/A"
          }`;

      console.log("Showing success message:", successMessage);
      showSuccess(successMessage, 8000);

      // Clear draft and reset form for new registration
      if (!isUpdateMode) {
        console.log("Resetting form for new registration");
        clearFormDraft();
        setLastSaved(null);
        
        // Reset form with all fields properly cleared
        setFormData({
          registrationNo: "",
          admissionDate: "",
          name: "",
          nameGivenByOrganization: "",
          dateOfBirth: "",
          gender: "",
          age: "",
          weight: "",
          height: "",
          religion: "",
          identificationMark: "",
          state: "",
          district: "",
          country: "India",
          fullAddress: "",
          city: "",
          pincode: "",
          latitude: "",
          longitude: "",
          alternativeAddress: "",
          nearestLandmark: "",
          distanceFromFacility: "",
          relativeAdmit: "",
          relationWith: "",
          guardianName: "",
          mobileNo: "",
          phoneNumber: "",
          alternativeContact: "",
          emailAddress: "",
          socialMediaHandle: "",
          voterId: "",
          aadhaarNumber: "",
          emergencyContactName: "",
          emergencyContactNumber: "",
          emergencyContactRelationship: "",
          healthStatus: "",
          category: "",
          bloodGroup: "",
          allergies: "",
          knownAllergies: "",
          medicalConditions: "",
          disabilityStatus: "",
          disabilityDetails: "",
          medications: "",
          rehabStatus: "",
          bodyTemperature: "",
          heartRate: "",
          respiratoryRate: "",
          bloodPressure: "",
          primaryDoctor: "",
          preferredHospital: "",
          medicalHistoryNotes: "",
          medicalHistory: "",
          comments: "",
          generalComments: "",
          medicalNotes: "",
          behavioralNotes: "",
          careInstructions: "",
          priorityLevel: "",
          updateSummary: "",
          updatedBy: "",
          lastUpdateDate: "",
          informerName: "",
          informerMobile: "",
          informerRelationship: "",
          informationDate: "",
          informerAddress: "",
          informationDetails: "",
          conveyanceVehicleNo: "",
          pickUpPlace: "",
          pickUpTime: "",
          entrantName: "",
          driverName: "",
          driverMobile: "",
          transportTime: "",
          transportNotes: "",
          admittedBy: "",
          organizationId: "",
          admissionStatus: "",
          ward: "",
          receiptNo: "",
          letterNo: "",
          itemDescription: "",
          itemAmount: "",
          videoUrl: "",
          photoBeforeAdmission: null,
          photoAfterAdmission: null,
          photo: null,
          documents: [],
          confirmDetails: false,
        });
        setCurrentStep(1);
        setFormErrors({});
      }
    } catch (error) {
      console.error("Submission error:", {
        message: error.message,
        stack: error.stack,
      });
      showError(
        `Error: ${
          error.message ||
          "Unable to submit registration. Please check your connection."
        }`
      );
    } finally {
      setIsSubmitting(false);
      console.log("Submission complete, isSubmitting set to false");
    }
  }

  const formFont = {
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
  };

  const SectionDivider = ({ label }) => (
    <div
      style={{
        borderBottom: "2px solid #e0e0e0",
        margin: "2.5rem 0 2rem 0",
        textAlign: "left",
      }}
    >
      <span
        style={{
          background: "#f8f9fa",
          padding: "0 1rem",
          fontWeight: 600,
          fontSize: "1.1rem",
          color: "#0A400C",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
    </div>
  );

  // Document category options
  const documentCategories = [
    { value: "medical", label: "Medical Records" },
    { value: "police_verification", label: "Police Verification" },
    { value: "identity_proof", label: "Identity Proof" },
    { value: "address_proof", label: "Address Proof" },
    { value: "court_documents", label: "Court Documents" },
    { value: "certificates", label: "Certificates" },
    { value: "legal_documents", label: "Legal Documents" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1
          className="text-center mt-5 pt-5"
          style={{
            color: "#0A400C",
            fontFamily: "Inter, Arial, Helvetica, sans-serif",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          <i className="fa fa-id-card-o me-2"></i>
          {isUpdateMode ? "Update Resident Information" : "Registration Form"}
        </h1>
      </div>

      <div
        className={`container mt-4 mb-5 shadow-lg p-5 rounded bg-light ${
          animate ? "form-container-animate" : ""
        }`}
        style={formFont}
      >
        {/* Form Steps */}
        <FormSteps
          steps={formSteps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        {/* Auto-save Status */}
        {!isUpdateMode && (
          <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light border rounded">
            <div className="d-flex align-items-center">
              <i className="fas fa-check-circle text-primary me-2"></i>
              <span className="text-primary fw-bold">Auto-save enabled</span>
              {lastSaved && (
                <span className="text-muted ms-4 small">
                  Last saved: {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to clear the saved draft? This will reset all form fields."
                  )
                ) {
                  clearFormDraft();
                  setLastSaved(null);
                  // Reset all form data to initial state
                  setFormData({
                    registrationNo: "",
                    admissionDate: "",
                    name: "",
                    nameGivenByOrganization: "",
                    dateOfBirth: "",
                    gender: "",
                    age: "",
                    weight: "",
                    height: "",
                    religion: "",
                    identificationMark: "",
                    state: "",
                    district: "",
                    country: "India",
                    fullAddress: "",
                    city: "",
                    pincode: "",
                    latitude: "",
                    longitude: "",
                    alternativeAddress: "",
                    nearestLandmark: "",
                    distanceFromFacility: "",
                    relativeAdmit: "",
                    relationWith: "",
                    guardianName: "",
                    mobileNo: "",
                    phoneNumber: "",
                    alternativeContact: "",
                    emailAddress: "",
                    socialMediaHandle: "",
                    voterId: "",
                    aadhaarNumber: "",
                    emergencyContactName: "",
                    emergencyContactNumber: "",
                    emergencyContactRelationship: "",
                    healthStatus: "",
                    category: "",
                    bloodGroup: "",
                    allergies: "",
                    knownAllergies: "",
                    medicalConditions: "",
                    disabilityStatus: "",
                    disabilityDetails: "",
                    medications: "",
                    rehabStatus: "",
                    bodyTemperature: "",
                    heartRate: "",
                    respiratoryRate: "",
                    bloodPressure: "",
                    primaryDoctor: "",
                    preferredHospital: "",
                    medicalHistoryNotes: "",
                    medicalHistory: "",
                    comments: "",
                    generalComments: "",
                    medicalNotes: "",
                    behavioralNotes: "",
                    careInstructions: "",
                    priorityLevel: "",
                    updateSummary: "",
                    updatedBy: "",
                    lastUpdateDate: "",
                    informerName: "",
                    informerMobile: "",
                    informerRelationship: "",
                    informationDate: "",
                    informerAddress: "",
                    informationDetails: "",
                    conveyanceVehicleNo: "",
                    pickUpPlace: "",
                    pickUpTime: "",
                    entrantName: "",
                    driverName: "",
                    driverMobile: "",
                    transportTime: "",
                    transportNotes: "",
                    admittedBy: "",
                    organizationId: "",
                    admissionStatus: "",
                    ward: "",
                    receiptNo: "",
                    letterNo: "",
                    itemDescription: "",
                    itemAmount: "",
                    videoUrl: "",
                    photoBeforeAdmission: null,
                    photoAfterAdmission: null,
                    photo: null,
                    documents: [],
                    confirmDetails: false,
                  });
                  // Reset form errors and step
                  setFormErrors({});
                  setCurrentStep(1);
                  showSuccess(
                    "Draft cleared and form reset successfully",
                    3000
                  );
                }
              }}
              className="btn btn-outline-danger btn-sm"
            >
              Clear Draft
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Basic Information
              </h3>
              <div className="row g-4">
                <div className="col-md-6">
                  <FormField
                    label="Registration No."
                    name="registrationNo"
                    value={formData.registrationNo}
                    onChange={handleInputChange}
                    error={formErrors.registrationNo}
                    placeholder="e.g. REG001, REG-2024-001"
                    helper="Unique identifier for this resident. Leave blank to auto-generate."
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Admission Date"
                    name="admissionDate"
                    type="date"
                    value={formData.admissionDate}
                    onChange={handleInputChange}
                    error={formErrors.admissionDate}
                    helper="Date when the resident was admitted to the facility."
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={formErrors.name}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Name Given by Organization"
                    name="nameGivenByOrganization"
                    value={formData.nameGivenByOrganization}
                    onChange={handleInputChange}
                    error={formErrors.nameGivenByOrganization}
                    placeholder="Enter name given by organization"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    error={formErrors.dateOfBirth}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Gender"
                    name="gender"
                    type="select"
                    value={formData.gender}
                    onChange={handleInputChange}
                    error={formErrors.gender}
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Age"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    error={formErrors.age}
                    placeholder="Enter age"
                    min="0"
                    max="150"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Weight (kg)"
                    name="weight"
                    type="number"
                    value={formData.weight}
                    onChange={handleInputChange}
                    error={formErrors.weight}
                    placeholder="Enter weight in kg"
                    min="0"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Height (cm)"
                    name="height"
                    type="number"
                    value={formData.height}
                    onChange={handleInputChange}
                    error={formErrors.height}
                    placeholder="Enter height in cm"
                    min="0"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Religion"
                    name="religion"
                    value={formData.religion}
                    onChange={handleInputChange}
                    error={formErrors.religion}
                    placeholder="Enter religion"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Identification Mark"
                    name="identificationMark"
                    value={formData.identificationMark}
                    onChange={handleInputChange}
                    error={formErrors.identificationMark}
                    placeholder="Enter identification mark"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Contact & Address Information
              </h3>
              <div className="row g-4">
                <div className="col-12">
                  <FormField
                    label="Full Address"
                    name="fullAddress"
                    type="textarea"
                    value={formData.fullAddress}
                    onChange={handleInputChange}
                    error={formErrors.fullAddress}
                    placeholder="Enter complete address"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    error={formErrors.state}
                    placeholder="Enter state"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="District"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    error={formErrors.district}
                    placeholder="Enter district"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    error={formErrors.city}
                    placeholder="Enter city"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="PIN Code"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    error={formErrors.pincode}
                    placeholder="6-digit PIN code"
                    maxLength="6"
                    pattern="[0-9]{6}"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Guardian Name"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleInputChange}
                    error={formErrors.guardianName}
                    placeholder="Enter guardian name"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Relative Who Admitted"
                    name="relativeAdmit"
                    value={formData.relativeAdmit}
                    onChange={handleInputChange}
                    error={formErrors.relativeAdmit}
                    placeholder="Enter relative name"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Relationship"
                    name="relationWith"
                    value={formData.relationWith}
                    onChange={handleInputChange}
                    error={formErrors.relationWith}
                    placeholder="Enter Relation"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Mobile Number"
                    name="mobileNo"
                    type="tel"
                    value={formData.mobileNo}
                    onChange={handleInputChange}
                    error={formErrors.mobileNo}
                    placeholder="e.g. 9876543210"
                    helper="10-digit mobile number starting with 6, 7, 8, or 9"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Alternative Contact"
                    name="alternativeContact"
                    value={formData.alternativeContact || ""}
                    onChange={handleInputChange}
                    error={formErrors.alternativeContact}
                    placeholder="Alternative contact number"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Email Address"
                    name="emailAddress"
                    type="email"
                    value={formData.emailAddress || ""}
                    onChange={handleInputChange}
                    error={formErrors.emailAddress}
                    placeholder="Email address"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Voter ID"
                    name="voterId"
                    value={formData.voterId}
                    onChange={handleInputChange}
                    error={formErrors.voterId}
                    placeholder="Enter voter ID"
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Aadhaar Number"
                    name="aadhaarNumber"
                    value={formData.aadhaarNumber}
                    onChange={handleInputChange}
                    error={formErrors.aadhaarNumber}
                    placeholder="Enter 12-digit Aadhaar number"
                    maxLength="12"
                    pattern="[0-9]{12}"
                  />
                </div>

                <div className="col-12 mt-4">
                  <h5 style={{ color: "red", fontWeight: 700 }}>
                    Emergency Contact
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <FormField
                        label="Emergency Contact Name"
                        name="emergencyContactName"
                        value={formData.emergencyContactName || ""}
                        onChange={handleInputChange}
                        error={formErrors.emergencyContactName}
                        placeholder="Emergency contact person"
                      />
                    </div>
                    <div className="col-md-4">
                      <FormField
                        label="Emergency Contact Number"
                        name="emergencyContactNumber"
                        value={formData.emergencyContactNumber || ""}
                        onChange={handleInputChange}
                        error={formErrors.emergencyContactNumber}
                        placeholder="Emergency contact number"
                      />
                    </div>
                    <div className="col-md-4">
                      <FormField
                        label="Emergency Contact Relationship"
                        name="emergencyContactRelationship"
                        type="select"
                        value={formData.emergencyContactRelationship || ""}
                        onChange={handleInputChange}
                        error={formErrors.emergencyContactRelationship}
                        options={[
                          { value: "", label: "Select Relationship" },
                          { value: "Parent", label: "Parent" },
                          { value: "Sibling", label: "Sibling" },
                          { value: "Spouse", label: "Spouse" },
                          { value: "Friend", label: "Friend" },
                          { value: "Other", label: "Other" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Health Information */}
          {currentStep === 3 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Health Information
              </h3>
              <div className="row g-4">
                <div className="col-md-6">
                  <FormField
                    label="Health Status"
                    name="healthStatus"
                    type="select"
                    value={formData.healthStatus}
                    onChange={handleInputChange}
                    error={formErrors.healthStatus}
                    options={[
                      { value: "", label: "Select Health Status" },
                      { value: "Good", label: "Good" },
                      { value: "Fair", label: "Fair" },
                      { value: "Critical", label: "Critical" },
                      { value: "Stable", label: "Stable" },
                    ]}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Blood Group"
                    name="bloodGroup"
                    type="select"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    error={formErrors.bloodGroup}
                    options={[
                      { value: "", label: "Select Blood Group" },
                      { value: "A+", label: "A+" },
                      { value: "A-", label: "A-" },
                      { value: "B+", label: "B+" },
                      { value: "B-", label: "B-" },
                      { value: "AB+", label: "AB+" },
                      { value: "AB-", label: "AB-" },
                      { value: "O+", label: "O+" },
                      { value: "O-", label: "O-" },
                    ]}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Category"
                    name="category"
                    type="select"
                    value={formData.category}
                    onChange={handleInputChange}
                    error={formErrors.category}
                    options={[
                      { value: "", label: "Select Category" },
                      { value: "Other", label: "Other" },
                      { value: "Emergency", label: "Emergency" },
                      { value: "Routine", label: "Routine" },
                    ]}
                  />
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Disability Status"
                    name="disabilityStatus"
                    type="select"
                    value={formData.disabilityStatus}
                    onChange={handleInputChange}
                    error={formErrors.disabilityStatus}
                    options={[
                      { value: "", label: "Select Status" },
                      { value: "None", label: "None" },
                      { value: "Physical", label: "Physical" },
                      { value: "Mental", label: "Mental" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>

                {/* Vital Signs & Physical Metrics */}
                <div className="col-12 mt-4">
                  <h5 style={{ color: "#00bfff", fontWeight: 700 }}>
                    Vital Signs & Physical Metrics
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <FormField
                        label="Body Temperature (°C)"
                                                name="bodyTemperature"
                        type="number"
                        value={formData.bodyTemperature || ""}
                        onChange={handleInputChange}
                        error={formErrors.bodyTemperature}
                        placeholder="Normal: 36.5-37.5"
                        min="30"
                        max="45"
                        step="0.1"
                      />
                    </div>
                    <div className="col-md-3">
                      <FormField
                        label="Heart Rate (BPM)"
                        name="heartRate"
                        type="number"
                        value={formData.heartRate || ""}
                        onChange={handleInputChange}
                        error={formErrors.heartRate}
                        placeholder="Normal: 60-100"
                        min="30"
                        max="200"
                      />
                    </div>
                    <div className="col-md-3">
                      <FormField
                        label="Respiratory Rate"
                        name="respiratoryRate"
                        type="number"
                        value={formData.respiratoryRate || ""}
                        onChange={handleInputChange}
                        error={formErrors.respiratoryRate}
                        placeholder="Normal: 12-20"
                        min="5"
                        max="40"
                      />
                    </div>
                    <div className="col-md-3">
                      <FormField
                        label="Blood Pressure"
                        name="bloodPressure"
                        value={formData.bloodPressure || ""}
                        onChange={handleInputChange}
                        error={formErrors.bloodPressure}
                        placeholder="e.g., 120/80"
                      />
                    </div>
                  </div>
                </div>

                {/* Disability Details */}
                <div className="col-md-6">
                  <FormField
                    label="Rehabilitation Status"
                    name="rehabStatus"
                    type="select"
                    value={formData.rehabStatus}
                    onChange={handleInputChange}
                    error={formErrors.rehabStatus}
                    options={[
                      { value: "", label: "Select Status" },
                      { value: "Ongoing", label: "Ongoing" },
                      { value: "Completed", label: "Completed" },
                      { value: "Not Required", label: "Not Required" },
                    ]}
                  />
                </div>
                <div className="col-12">
                  <FormField
                    label="Disability Details"
                    name="disabilityDetails"
                    type="textarea"
                    value={formData.disabilityDetails || ""}
                    onChange={handleInputChange}
                    error={formErrors.disabilityDetails}
                    placeholder="Detailed description of disability, limitations, or special needs"
                  />
                </div>

                {/* Allergies & Medical Conditions */}
                <div className="col-12 mt-4">
                  <h5 style={{ color: "red", fontWeight: 700 }}>
                    Allergies & Medical Conditions
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <FormField
                        label="Known Allergies"
                        name="knownAllergies"
                        type="textarea"
                        value={formData.knownAllergies || ""}
                        onChange={handleInputChange}
                        error={formErrors.knownAllergies}
                        placeholder="List any known allergies (food, medication, environmental)"
                      />
                    </div>
                    <div className="col-md-4">
                      <FormField
                        label="Medical Conditions"
                        name="medicalConditions"
                        type="textarea"
                        value={formData.medicalConditions}
                        onChange={handleInputChange}
                        error={formErrors.medicalConditions}
                        placeholder="Current medical conditions, chronic illnesses, past surgeries"
                      />
                    </div>
                    <div className="col-md-4">
                      <FormField
                        label="Current Medications"
                        name="medications"
                        type="textarea"
                        value={formData.medications || ""}
                        onChange={handleInputChange}
                        error={formErrors.medications}
                        placeholder="List current medications with dosage and frequency"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Health Information */}
                <div className="col-12 mt-4">
                  <h5 style={{ color: "green", fontWeight: 700 }}>
                    Additional Health Information
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <FormField
                        label="Primary Doctor"
                        name="primaryDoctor"
                        value={formData.primaryDoctor || ""}
                        onChange={handleInputChange}
                        error={formErrors.primaryDoctor}
                        placeholder="Name of primary doctor"
                      />
                    </div>
                    <div className="col-md-6">
                      <FormField
                        label="Preferred Hospital"
                        name="preferredHospital"
                        value={formData.preferredHospital || ""}
                        onChange={handleInputChange}
                        error={formErrors.preferredHospital}
                        placeholder="Preferred hospital for treatment"
                      />
                    </div>
                    <div className="col-12">
                      <FormField
                        label="Medical History Notes"
                        name="medicalHistoryNotes"
                        type="textarea"
                        value={formData.medicalHistoryNotes || ""}
                        onChange={handleInputChange}
                        error={formErrors.medicalHistoryNotes}
                        placeholder="Additional medical history, family history, or important notes"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Administrative Information */}
          {currentStep === 4 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                <i className="fas fa-clipboard-list me-2"></i>
                Administrative Information
              </h3>
              
              {/* Informer Information */}
              <div className="mb-4">
                <h5 style={{ color: "#007bff", fontWeight: 700 }}>
                  Informer Information
                </h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FormField
                      label="Informer Name"
                      name="informerName"
                      value={formData.informerName}
                      onChange={handleInputChange}
                      error={formErrors.informerName}
                      placeholder="Name of person providing information"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Informer Mobile"
                      name="informerMobile"
                      type="tel"
                      value={formData.informerMobile}
                      onChange={handleInputChange}
                      error={formErrors.informerMobile}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      pattern="[0-9]{10}"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Relationship to Resident"
                      name="informerRelationship"
                      type="select"
                      value={formData.informerRelationship}
                      onChange={handleInputChange}
                      error={formErrors.informerRelationship}
                      options={[
                        { value: "", label: "Select Relationship" },
                        { value: "Family Member", label: "Family Member" },
                        { value: "Friend", label: "Friend" },
                        { value: "Neighbor", label: "Neighbor" },
                        { value: "Social Worker", label: "Social Worker" },
                        { value: "Police", label: "Police" },
                        { value: "Hospital Staff", label: "Hospital Staff" },
                        {
                          value: "Government Official",
                          label: "Government Official",
                        },
                        { value: "NGO Worker", label: "NGO Worker" },
                        { value: "Self", label: "Self" },
                        { value: "Other", label: "Other" },
                      ]}
                    />
                  </div>
                  <div className="col-md-6">
                    <FormField
                      label="Information Date"
                      name="informationDate"
                      type="date"
                      value={formData.informationDate}
                      onChange={handleInputChange}
                      error={formErrors.informationDate}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="col-md-6">
                    <FormField
                      label="Informer Address"
                      name="informerAddress"
                      value={formData.informerAddress}
                      onChange={handleInputChange}
                      error={formErrors.informerAddress}
                      placeholder="Informer's address"
                    />
                  </div>
                  <div className="col-12">
                    <FormField
                      label="Information Details"
                      name="informationDetails"
                      type="textarea"
                      value={formData.informationDetails}
                      onChange={handleInputChange}
                      error={formErrors.informationDetails}
                      placeholder="Details about how and why this information was provided"
                    />
                  </div>
                </div>
              </div>

              {/* Transportation Details */}
              <div className="mb-4">
                <h5 style={{ color: "#00bfff", fontWeight: 700 }}>
                  Transport Details
                </h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FormField
                      label="Vehicle Number"
                      name="conveyanceVehicleNo"
                      value={formData.conveyanceVehicleNo || ""}
                      onChange={handleInputChange}
                      error={formErrors.conveyanceVehicleNo}
                      placeholder="TRANSPORT VEHICLE NUMBER"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Driver Name"
                      name="driverName"
                      value={formData.driverName || ""}
                      onChange={handleInputChange}
                      error={formErrors.driverName}
                      placeholder="Driver's full name"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Driver Mobile"
                      name="driverMobile"
                      value={formData.driverMobile || ""}
                      onChange={handleInputChange}
                      error={formErrors.driverMobile}
                      placeholder="Driver's mobile number"
                    />
                  </div>
                  <div className="col-md-6">
                    <FormField
                      label="Pick Up Place"
                      name="pickUpPlace"
                      value={formData.pickUpPlace || ""}
                      onChange={handleInputChange}
                      error={formErrors.pickUpPlace}
                      placeholder="Location where resident was picked up"
                    />
                  </div>
                  <div className="col-md-6">
                    <FormField
                      label="Pick Up Time"
                      name="pickUpTime"
                      type="datetime-local"
                      value={formData.pickUpTime || ""}
                      onChange={handleInputChange}
                      error={formErrors.pickUpTime}
                      placeholder="dd-mm-yyyy --:--"
                    />
                  </div>
                </div>
              </div>

              {/* Organization & Admission Details */}
              <div className="mb-4">
                <h5 style={{ color: "green", fontWeight: 700 }}>
                  Organization & Admission Details
                </h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FormField
                      label="Admitted By"
                      name="admittedBy"
                      value={formData.admittedBy || ""}
                      onChange={handleInputChange}
                      error={formErrors.admittedBy}
                      placeholder="Name of admitting officer"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Data Entrant Name"
                      name="entrantName"
                      value={formData.entrantName || ""}
                      onChange={handleInputChange}
                      error={formErrors.entrantName}
                      placeholder="Name of person who entered data"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Ward Assignment"
                      name="ward"
                      value={formData.ward || ""}
                      onChange={handleInputChange}
                      error={formErrors.ward}
                      placeholder="Ward or room assignment"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Documentation */}
              <div className="mb-4">
                <h5 style={{ color: "#ffc107", fontWeight: 700 }}>
                  Financial & Documentation
                </h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FormField
                      label="Receipt Number"
                      name="receiptNo"
                      value={formData.receiptNo || ""}
                      onChange={handleInputChange}
                      error={formErrors.receiptNo}
                      placeholder="Financial receipt number"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Letter Number"
                      name="letterNo"
                      value={formData.letterNo || ""}
                      onChange={handleInputChange}
                      error={formErrors.letterNo}
                      placeholder="Official letter number"
                    />
                  </div>
                  <div className="col-md-4">
                    <FormField
                      label="Item Amount (₹)"
                      name="itemAmount"
                      value={formData.itemAmount || ""}
                      onChange={handleInputChange}
                      error={formErrors.itemAmount}
                      placeholder="Value of items/money"
                    />
                  </div>
                  <div className="col-12">
                    <FormField
                      label="Item Description"
                      name="itemDescription"
                      type="textarea"
                      value={formData.itemDescription || ""}
                      onChange={handleInputChange}
                      error={formErrors.itemDescription}
                      placeholder="Detailed description of personal belongings, money, or items found with resident"
                    />
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <FormField
                    label="Organization ID"
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleInputChange}
                    error={formErrors.organizationId}
                    placeholder="Organization identifier"
                  />
                </div>
                <div className="col-12">
                  <FormField
                    label="Transport Notes"
                    name="transportNotes"
                    type="textarea"
                    value={formData.transportNotes}
                    onChange={handleInputChange}
                    error={formErrors.transportNotes}
                    placeholder="Additional notes about transportation, condition at pickup, etc."
                                    />
                </div>
                <div className="col-12">
                  <FormField
                    label="Comments"
                    name="comments"
                    type="textarea"
                    value={formData.comments}
                    onChange={handleInputChange}
                    error={formErrors.comments}
                    placeholder="Enter any additional comments"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Documents & Photos */}
          {currentStep === 5 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Documents & Media
              </h3>

              {/* Photo Upload Section - Both Photos */}
              <div className="row g-4 mb-5">
                <div className="col-12">
                  <h5
                    className="text-secondary mb-3"
                    style={{
                      fontWeight: 600,
                      borderBottom: "1px solid #dee2e6",
                      paddingBottom: "8px",
                    }}
                  >
                    📸 Photo Upload
                  </h5>
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Photo (Before Admission)"
                    name="photoBeforeAdmission"
                    type="file"
                    onChange={handleInputChange}
                    error={formErrors.photoBeforeAdmission}
                    accept="image/*"
                    helpText="Upload photo taken before admission (JPG, PNG, max 5MB)"
                  />
                  {/* Display existing photo if in update mode */}
                  {isUpdateMode && formData.photoBeforeAdmissionUrl && (
                    <div className="mt-2">
                      <small className="text-muted">Current photo:</small>
                      <img 
                        src={formData.photoBeforeAdmissionUrl} 
                        alt="Before Admission" 
                        className="img-thumbnail mt-1"
                        style={{ maxWidth: "100px", maxHeight: "100px" }}
                      />
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Photo (After Admission)"
                    name="photoAfterAdmission"
                    type="file"
                    onChange={handleInputChange}
                    error={formErrors.photoAfterAdmission}
                    accept="image/*"
                    helpText="Upload photo taken after admission (JPG, PNG, max 5MB)"
                  />
                  {/* Display existing photo if in update mode */}
                  {isUpdateMode && formData.photoAfterAdmissionUrl && (
                    <div className="mt-2">
                      <small className="text-muted">Current photo:</small>
                      <img 
                        src={formData.photoAfterAdmissionUrl} 
                        alt="After Admission" 
                        className="img-thumbnail mt-1"
                        style={{ maxWidth: "100px", maxHeight: "100px" }}
                      />
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <FormField
                    label="Video URL"
                    name="videoUrl"
                    type="url"
                    value={formData.videoUrl}
                    onChange={handleInputChange}
                    error={formErrors.videoUrl}
                    placeholder="https://..."
                    helpText="Optional: Link to video documentation"
                  />
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="row g-4">
                <div className="col-12">
                  <h5
                    className="text-secondary mb-3"
                    style={{
                      fontWeight: 600,
                      borderBottom: "1px solid #dee2e6",
                      paddingBottom: "8px",
                    }}
                  >
                    📄 Upload Documents{" "}
                    <span className="badge bg-secondary ms-2">Optional</span>
                  </h5>
                  <div className="alert alert-info mb-4" role="alert">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-info-circle me-2 mt-1"></i>
                      <div>
                        <strong>Document Types You Can Upload:</strong>
                        <ul className="mb-0 mt-2">
                          <li>Medical records and reports</li>
                          <li>Police verification documents</li>
                          <li>
                            Identity proofs (Passport, Driving License, etc.)
                          </li>
                          <li>Address proof documents</li>
                          <li>Court documents and legal papers</li>
                          <li>Educational certificates</li>
                          <li>Other relevant documents</li>
                        </ul>
                        <small className="text-muted d-block mt-2">
                          Maximum file size: 10MB per document. Supported
                          formats: PDF, DOC, DOCX, JPG, PNG
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload Input */}
                <div className="col-12">
                  <div
                    className="border-2 border-dashed rounded p-4 text-center"
                    style={{
                      borderColor: "#0A400C",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                    <div className="mb-3">
                      <label
                        htmlFor="documentUpload"
                        className="form-label fw-bold"
                      >
                        Choose Documents to Upload
                      </label>
                      <input
                        type="file"
                        id="documentUpload"
                        className="form-control"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                      />
                    </div>
                    <small className="text-muted">
                      You can select multiple files at once. Hold Ctrl/Cmd to
                      select multiple files.
                    </small>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {formData.documents.length > 0 && (
                  <div className="col-12">
                    <h6 className="fw-bold mb-3">
                      Uploaded Documents ({formData.documents.length})
                    </h6>
                    <div
                      className="border rounded p-3"
                      style={{ maxHeight: "400px", overflowY: "auto" }}
                    >
                      {formData.documents.map((doc, index) => (
                        <div
                          key={doc.id}
                          className="border rounded p-3 mb-3 bg-white"
                        >
                          <div className="row align-items-center">
                            <div className="col-md-4">
                              <div className="d-flex align-items-center">
                                <i className="fas fa-file-alt text-primary me-2"></i>
                                <div>
                                  <strong className="d-block">
                                    {doc.name}
                                  </strong>
                                  <small className="text-muted">
                                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                                  </small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <select
                                className="form-select form-select-sm"
                                value={doc.category}
                                onChange={(e) =>
                                  updateDocumentDetails(
                                    doc.id,
                                    "category",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select Category</option>
                                {documentCategories.map((cat) => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Description (optional)"
                                value={doc.description}
                                onChange={(e) =>
                                  updateDocumentDetails(
                                    doc.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="col-md-1">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removeDocument(doc.id)}
                                title="Remove document"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Review & Confirm Details
              </h3>

              <div className="alert alert-info mb-4" role="alert">
                Please review all the information below before submitting the
                form. You can go back to any step to make changes.
              </div>

              {/* Basic Information Review */}
              <div className="mb-4">
                <h5 className="text-primary mb-3">Basic Information</h5>
                <div className="row g-3">
                  {formData.registrationNo && (
                    <div className="col-md-6">
                      <strong>Registration No.:</strong>{" "}
                      {formData.registrationNo}
                    </div>
                  )}
                  {formData.admissionDate && (
                    <div className="col-md-6">
                      <strong>Admission Date:</strong>{" "}
                      {new Date(formData.admissionDate).toLocaleDateString()}
                    </div>
                  )}
                  {formData.name && (
                    <div className="col-md-6">
                      <strong>Full Name:</strong> {formData.name}
                    </div>
                  )}
                  {formData.nameGivenByOrganization && (
                    <div className="col-md-6">
                      <strong>Name by Organization:</strong>{" "}
                      {formData.nameGivenByOrganization}
                    </div>
                  )}
                  {formData.dateOfBirth && (
                    <div className="col-md-6">
                      <strong>Date of Birth:</strong>{" "}
                      {new Date(formData.dateOfBirth).toLocaleDateString()}
                    </div>
                  )}
                  {formData.gender && (
                    <div className="col-md-6">
                      <strong>Gender:</strong> {formData.gender}
                    </div>
                  )}
                  {formData.age && (
                    <div className="col-md-6">
                      <strong>Age:</strong> {formData.age} years
                    </div>
                  )}
                  {formData.weight && (
                    <div className="col-md-6">
                      <strong>Weight:</strong> {formData.weight} kg
                    </div>
                  )}
                  {formData.height && (
                    <div className="col-md-6">
                      <strong>Height:</strong> {formData.height} cm
                    </div>
                  )}
                  {formData.religion && (
                    <div className="col-md-6">
                      <strong>Religion:</strong> {formData.religion}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Review */}
              <div className="mb-4">
                <h5 className="text-primary mb-3">
                  Contact & Address Information
                </h5>
                <div className="row g-3">
                  {formData.fullAddress && (
                    <div className="col-12">
                      <strong>Full Address:</strong> {formData.fullAddress}
                    </div>
                  )}
                  {formData.state && (
                    <div className="col-md-6">
                      <strong>State:</strong> {formData.state}
                    </div>
                  )}
                  {formData.district && (
                    <div className="col-md-6">
                      <strong>District:</strong> {formData.district}
                    </div>
                  )}
                  {formData.guardianName && (
                    <div className="col-md-6">
                      <strong>Guardian Name:</strong> {formData.guardianName}
                    </div>
                  )}
                  {formData.mobileNo && (
                    <div className="col-md-6">
                      <strong>Mobile Number:</strong> {formData.mobileNo}
                    </div>
                  )}
                  {formData.voterId && (
                    <div className="col-md-6">
                      <strong>Voter ID:</strong> {formData.voterId}
                    </div>
                  )}
                  {formData.aadhaarNumber && (
                    <div className="col-md-6">
                      <strong>Aadhaar Number:</strong> {formData.aadhaarNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Health Information Review */}
              <div className="mb-4">
                <h5 className="text-primary mb-3">Health Information</h5>
                <div className="row g-3">
                  {formData.healthStatus && (
                    <div className="col-md-6">
                      <strong>Health Status:</strong>
                      <span
                        className={`ms-2 px-2 py-1 rounded text-sm ${
                          formData.healthStatus?.toLowerCase().includes("good")
                            ? "bg-success bg-opacity-10 text-success"
                            : formData.healthStatus?.toLowerCase().includes("critical")
                            ? "bg-danger bg-opacity-10 text-danger"
                            : "bg-warning bg-opacity-10 text-warning"
                        }`}
                      >
                        {formData.healthStatus}
                      </span>
                    </div>
                  )}
                  {formData.category && (
                    <div className="col-md-6">
                      <strong>Category:</strong> {formData.category}
                    </div>
                  )}
                  {formData.bloodGroup && (
                    <div className="col-md-6">
                      <strong>Blood Group:</strong> {formData.bloodGroup}
                    </div>
                  )}
                  {formData.allergies && (
                    <div className="col-12">
                      <strong>Allergies:</strong> {formData.allergies}
                    </div>
                  )}
                  {formData.medicalConditions && (
                    <div className="col-12">
                      <strong>Medical Conditions:</strong>{formData.medicalConditions}
                    </div>
                  )}
                  {formData.disabilityStatus && (
                    <div className="col-md-6">
                      <strong>Disability Status:</strong>{" "}
                      {formData.disabilityStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Administrative Information Review */}
              <div className="mb-4">
                <h5 className="text-primary mb-3">
                  Administrative Information
                </h5>
                <div className="row g-3">
                  {formData.ward && (
                    <div className="col-md-6">
                      <strong>Ward:</strong> {formData.ward}
                    </div>
                  )}
                  {formData.admittedBy && (
                    <div className="col-md-6">
                      <strong>Admitted By:</strong> {formData.admittedBy}
                    </div>
                  )}
                  {formData.rehabStatus && (
                    <div className="col-md-6">
                      <strong>Rehabilitation Status:</strong>{" "}
                      {formData.rehabStatus}
                    </div>
                  )}
                  {formData.receiptNo && (
                    <div className="col-md-6">
                      <strong>Receipt No.:</strong> {formData.receiptNo}
                    </div>
                  )}
                  {formData.comments && (
                    <div className="col-12">
                      <strong>Comments:</strong> {formData.comments}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents & Photos Review */}
              <div className="mb-4">
                <h5 className="text-primary mb-3">Documents & Media</h5>
                <div className="row g-3">
                  {formData.photoBeforeAdmission && (
                    <div className="col-md-6">
                      <strong>Photo (Before Admission):</strong> {formData.photoBeforeAdmission.name}
                    </div>
                  )}
                  {formData.photoAfterAdmission && (
                    <div className="col-md-6">
                      <strong>Photo (After Admission):</strong> {formData.photoAfterAdmission.name}
                    </div>
                  )}
                  {formData.videoUrl && (
                    <div className="col-md-6">
                      <strong>Video URL:</strong>
                      <a
                        href={formData.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ms-2"
                      >
                        {formData.videoUrl}
                      </a>
                    </div>
                  )}
                  {formData.documents.length > 0 && (
                    <div className="col-12">
                      <strong>
                        Uploaded Documents ({formData.documents.length}):
                      </strong>
                      <div className="mt-2">
                        {formData.documents.map((doc, index) => (
                          <div
                            key={doc.id}
                            className="border rounded p-2 mb-2 bg-light"
                          >
                            <div className="row align-items-center">
                              <div className="col-md-4">
                                <i className="fas fa-file-alt text-primary me-2"></i>
                                <strong>{doc.name}</strong>
                              </div>
                              <div className="col-md-3">
                                <span className="badge bg-secondary">
                                  {documentCategories.find(
                                    (cat) => cat.value === doc.category
                                  )?.label || "Uncategorized"}
                                </span>
                              </div>
                              <div className="col-md-5">
                                {doc.description && (
                                  <small className="text-muted">
                                    {doc.description}
                                  </small>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="mt-4 p-3 bg-light rounded">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="confirmDetails"
                    checked={formData.confirmDetails || false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmDetails: e.target.checked,
                      }))
                    }
                  />
                  <label
                    className="form-check-label fw-semibold"
                    htmlFor="confirmDetails"
                  >
                    I confirm that all the information provided above is
                    accurate and complete to the best of my knowledge.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="d-flex justify-content-between mt-4">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="btn btn-outline-secondary px-4 py-2"
              style={{ fontWeight: 600 }}
            >
              Previous
            </button>

            <div className="d-flex gap-2">
              {currentStep < formSteps.length ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn btn-primary px-4 py-2"
                  style={{
                    background: "#0A400C",
                    borderColor: "#0A400C",
                    fontWeight: 600,
                  }}
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.confirmDetails}
                  className="btn btn-success px-5 py-2"
                  style={{
                    background:
                      isSubmitting || !formData.confirmDetails
                        ? "#6c757d"
                        : "#0A400C",
                    borderColor:
                      isSubmitting || !formData.confirmDetails
                        ? "#6c757d"
                        : "#0A400C",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {isUpdateMode ? "Updating..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <i className="fa fa-check me-2"></i>
                      {isUpdateMode ? "Update Resident" : "Register Resident"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default RegistrationForm;

