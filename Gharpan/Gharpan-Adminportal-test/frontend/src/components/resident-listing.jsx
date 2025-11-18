import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Eye,
  Users,
  Calendar,
  Filter,
  Download,
  Trash2,
  X,
  ChevronDown,
  Activity,
  ExternalLink,
  Edit,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "react-router-dom";

const ResidentsListing = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedResident, setSelectedResident] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewResident, setPreviewResident] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateResident, setUpdateResident] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // FIXED: Better form state management using useState instead of useRef for better React practices
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [changedFields, setChangedFields] = useState(new Set());

  // Sorting state
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");

  // Advanced filter states
  const [filters, setFilters] = useState({
    gender: "",
    healthStatus: "",
    category: "",
    bloodGroup: "",
    state: "",
    ageRange: { min: "", max: "" },
    admissionDateRange: { start: "", end: "" },
    disabilityStatus: "",
    rehabStatus: "",
  });

  // Utility function to check for valid ObjectId
  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Fetch residents data
  const fetchResidents = async (page = 1, search = "", appliedFilters = {}, sort = { field: sortField, order: sortOrder }) => {
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: search,
        sortField: sort.field,
        sortOrder: sort.order,
      });

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value && value !== "") {
          if (key === "ageRange") {
            if (value.min) params.append("ageMin", value.min);
            if (value.max) params.append("ageMax", value.max);
          } else if (key === "admissionDateRange") {
            if (value.start) params.append("admissionDateStart", value.start);
            if (value.end) params.append("admissionDateEnd", value.end);
          } else {
            params.append(key, value);
          }
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `/api/residents?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setResidents(result.data);
        setTotalPages(result.pagination.totalPages);
        setCurrentPage(result.pagination.currentPage);
        setError("");
      } else {
        setError(result.message || "Failed to fetch residents");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.");
      } else {
        setError("Network error. Please check if the server is running.");
      }
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single resident details
  const fetchResidentDetails = async (id) => {
    try {
      const response = await fetch(`/api/residents/${id}`);
      const result = await response.json();

      if (result.success) {
        setSelectedResident(result.data);
        setShowDetails(true);
      } else {
        setError(result.message || "Failed to fetch resident details");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Fetch details error:", err);
    }
  };

  // Delete resident
  const deleteResident = async (id) => {
    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/residents/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      console.log('Delete resident response:', { status: response.status, result });

      if (result.success) {
        setResidents(residents.filter((resident) => resident._id !== id));
        setShowDeleteConfirm(null);
        setError("");
      } else {
        setError(result.message || `Failed to delete resident (Status: ${response.status})`);
      }
    } catch (err) {
      console.error('Delete resident error:', err, { id });
      setError(`Network error: ${err.message}. Please try again.`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // FIXED: Handle update resident - preserve existing values
  const handleUpdateClick = (resident) => {
    console.log("Opening update modal for resident:", resident._id);
    setUpdateResident(resident);
    
    // FIXED: Create form data while preserving all existing values
    const initialFormData = {
      // Basic Information
      registrationNo: resident.registrationNo || "",
      admissionDate: resident.admissionDate || "",
      name: resident.name || "",
      nameGivenByOrganization: resident.nameGivenByOrganization || "",
      age: resident.age || "",
      gender: resident.gender || "",
      dateOfBirth: resident.dateOfBirth || "",
      weight: resident.weight || "",
      height: resident.height || "",
      religion: resident.religion || "",
      identificationMark: resident.identificationMark || "",
      
      // Contact Information
      mobileNo: resident.mobileNo || "",
      phoneNumber: resident.phoneNumber || "",
      alternativeContact: resident.alternativeContact || "",
      emailAddress: resident.emailAddress || "",
      socialMediaHandle: resident.socialMediaHandle || "",
      relativeAdmit: resident.relativeAdmit || "",
      relationWith: resident.relationWith || "",
      emergencyContactName: resident.emergencyContactName || "",
      emergencyContactNumber: resident.emergencyContactNumber || "",
      emergencyContactRelationship: resident.emergencyContactRelationship || "",
      voterId: resident.voterId || "",
      aadhaarNumber: resident.aadhaarNumber || "",

      // Health Information
      healthStatus: resident.healthStatus || "",
      category: resident.category || "",
      bloodGroup: resident.bloodGroup || "",
      bodyTemperature: resident.bodyTemperature || "",
      heartRate: resident.heartRate || "",
      respiratoryRate: resident.respiratoryRate || "",
      bloodPressure: resident.bloodPressure || "",
      allergies: resident.allergies || "",
      knownAllergies: resident.knownAllergies || "",
      medicalConditions: resident.medicalConditions || "",
      medications: resident.medications || "",
      disabilityStatus: resident.disabilityStatus || "",
      disabilityDetails: resident.disabilityDetails || "",
      rehabStatus: resident.rehabStatus || "",
      medicalHistoryNotes: resident.medicalHistoryNotes || "",
      medicalHistory: resident.medicalHistory || "",
      primaryDoctor: resident.primaryDoctor || "",
      preferredHospital: resident.preferredHospital || "",
      
      // Address Information
      address: {
        fullAddress: resident.address?.fullAddress || "",
        city: resident.address?.city || "",
        district: resident.address?.district || "",
        state: resident.address?.state || "",
        country: resident.address?.country || "",
        pincode: resident.address?.pincode || "",
        latitude: resident.address?.latitude || "",
        longitude: resident.address?.longitude || "",
      },
      alternativeAddress: resident.alternativeAddress || "",
      nearestLandmark: resident.nearestLandmark || "",
      distanceFromFacility: resident.distanceFromFacility || "",

      // Informer Information
      informerName: resident.informerName || "",
      informerMobile: resident.informerMobile || "",
      informerRelationship: resident.informerRelationship || "",
      informationDate: resident.informationDate || "",
      informerAddress: resident.informerAddress || "",
      informationDetails: resident.informationDetails || "",

      // Transport & Organization Information
      conveyanceVehicleNo: resident.conveyanceVehicleNo || "",
      pickUpPlace: resident.pickUpPlace || "",
      pickUpTime: resident.pickUpTime || "",
      entrantName: resident.entrantName || "",
      driverName: resident.driverName || "",
      driverMobile: resident.driverMobile || "",
      admittedBy: resident.admittedBy || "",
      ward: resident.ward || "",
      organizationId: resident.organizationId || "",
      admissionStatus: resident.admissionStatus || "",
      transportNotes: resident.transportNotes || "",
      receiptNo: resident.receiptNo || "",
      letterNo: resident.letterNo || "",
      itemDescription: resident.itemDescription || "",
      itemAmount: resident.itemAmount || "",
      videoUrl: resident.videoUrl || "",

      // Additional Information
      comments: resident.comments || "",
      generalComments: resident.generalComments || "",
      medicalNotes: resident.medicalNotes || "",
      behavioralNotes: resident.behavioralNotes || "",
      careInstructions: resident.careInstructions || "",
      priorityLevel: resident.priorityLevel || "",
      lastUpdateDate: resident.lastUpdateDate || "",
      updatedBy: resident.updatedBy || "",
      updateSummary: resident.updateSummary || "",
    };
    
    setOriginalData({ ...initialFormData });
    setFormData({ ...initialFormData });
    setChangedFields(new Set());
    setShowUpdateModal(true);
  };

  // FIXED: Handle form input changes - track only changed fields
  const handleFormInputChange = (fieldName, value) => {
    let cleanedValue = value;
    
    // Input validation and cleaning
    if (
      fieldName === "age" ||
      fieldName === "weight" ||
      fieldName === "height" ||
      fieldName === "itemAmount" ||
      fieldName === "bodyTemperature" ||
      fieldName === "heartRate" ||
      fieldName === "respiratoryRate" ||
      fieldName === "distanceFromFacility"
    ) {
      if (cleanedValue !== "" && (isNaN(cleanedValue) || Number(cleanedValue) < 0)) {
        return;
      }
    }

    if (
      fieldName === "mobileNo" ||
      fieldName === "driverMobile" ||
      fieldName === "informerMobile" ||
      fieldName === "emergencyContactNumber"
    ) {
      cleanedValue = cleanedValue.replace(/[^0-9]/g, "");
      if (cleanedValue.length > 10) {
        cleanedValue = cleanedValue.slice(0, 10);
      }
    }

    if (fieldName === "aadhaarNumber") {
      cleanedValue = cleanedValue.replace(/[^0-9]/g, "");
      if (cleanedValue.length > 12) {
        cleanedValue = cleanedValue.slice(0, 12);
      }
    }

    setFormData(prevData => {
      const newData = { ...prevData };
      if (fieldName.startsWith('address.')) {
        const addressField = fieldName.split('.')[1];
        newData.address = { ...newData.address, [addressField]: cleanedValue };
      } else {
        newData[fieldName] = cleanedValue;
      }
      return newData;
    });

    setChangedFields(prev => {
      const newSet = new Set(prev);
      const originalValue = fieldName.startsWith('address.')
        ? originalData.address?.[fieldName.split('.')[1]]
        : originalData[fieldName];
      
      if (String(cleanedValue) !== String(originalValue)) {
        newSet.add(fieldName);
      } else {
        newSet.delete(fieldName);
      }
      return newSet;
    });
  };

  // FIXED: Update resident data - send only changed fields
  const updateResidentData = async () => {
    if (changedFields.size === 0) {
      setError("No changes detected to save.");
      return;
    }

    setUpdateLoading(true);
    try {
      const updatePayload = {};
      
      changedFields.forEach(fieldName => {
        if (fieldName.startsWith('address.')) {
          if (!updatePayload.address) {
            updatePayload.address = {};
          }
          const addressField = fieldName.split('.')[1];
          updatePayload.address[addressField] = formData.address[addressField];
        } else {
          updatePayload[fieldName] = formData[fieldName];
        }
      });

      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === "") {
          updatePayload[key] = null;
        }
        
        // Handle numeric fields
        if (
          (key === "age" ||
           key === "weight" ||
           key === "height" ||
           key === "itemAmount" ||
           key === "bodyTemperature" ||
           key === "heartRate" ||
           key === "respiratoryRate" ||
           key === "distanceFromFacility") &&
          updatePayload[key] !== null && 
          updatePayload[key] !== ""
        ) {
          updatePayload[key] = Number(updatePayload[key]);
        }
      });

      if (updatePayload.address) {
        Object.keys(updatePayload.address).forEach((key) => {
          if (updatePayload.address[key] === "") {
            updatePayload.address[key] = null;
          }
        });
      }
      
      console.log("Sending update payload (only changed fields):", updatePayload);
      console.log("Changed fields:", Array.from(changedFields));

      const response = await fetch(
        `/api/residents/${updateResident._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      const result = await response.json();

      if (result.success) {
        setResidents(prevResidents =>
          prevResidents.map((resident) =>
            resident._id === updateResident._id
              ? { ...resident, ...result.data }
              : resident
          )
        );
        
        closeUpdateModal(); // Use the dedicated close function
        setError("Resident updated successfully!");
        setTimeout(() => setError(""), 3000);
        
        console.log("Update successful");
      } else {
        console.error("Update failed:", result);
        setError(result.message || "Failed to update resident");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("Network error. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Close update modal
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdateResident(null);
    setFormData({});
    setOriginalData({});
    setChangedFields(new Set());
    setError(""); // Clear any error messages from the modal
  };

  // Handle sorting
  const handleSort = (field) => {
    const newOrder = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(newOrder);
    fetchResidents(1, searchTerm, filters, { field, order: newOrder });
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchResidents(currentPage, searchTerm, filters, { field: sortField, order: sortOrder });
  }, [currentPage, sortField, sortOrder]);

  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      fetchResidents(1, searchValue, filters, { field: sortField, order: sortOrder });
    }, 500),
    [filters, sortField, sortOrder]
  );

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 2 || value.length === 0) {
      debouncedSearch(value);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchResidents(1, searchTerm, filters, { field: sortField, order: sortOrder });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchResidents(page, searchTerm, filters, { field: sortField, order: sortOrder });
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchResidents(1, searchTerm, filters, { field: sortField, order: sortOrder });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      gender: "",
      healthStatus: "",
      category: "",
      bloodGroup: "",
      state: "",
      ageRange: { min: "", max: "" },
      admissionDateRange: { start: "", end: "" },
      disabilityStatus: "",
      rehabStatus: "",
    };
    setFilters(clearedFilters);
    fetchResidents(1, searchTerm, clearedFilters, { field: sortField, order: sortOrder });
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        export: "true",
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "") {
          if (key === "ageRange") {
            if (value.min) params.append("ageMin", value.min);
            if (value.max) params.append("ageMax", value.max);
          } else if (key === "admissionDateRange") {
            if (value.start) params.append("admissionDateStart", value.start);
            if (value.end) params.append("admissionDateEnd", value.end);
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await fetch(
        `/api/residents/export?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `residents_export_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export data. Please try again.");
      }
    } catch (err) {
      setError("Export failed. Please check your connection.");
      console.error("Export error:", err);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (resident) => {
    fetchResidentDetails(resident._id);
  };

  // Download individual resident details with confirmation
  const downloadResidentDetails = async (
    residentId,
    registrationNo,
    residentName
  ) => {
    const confirmDownload = window.confirm(
      `Download resident details for:\n\n` +
      `Name: ${residentName || "N/A"}\n` +
      `Registration No: ${registrationNo || "N/A"}\n\n` +
      `This will generate a comprehensive PDF report with all resident information.\n\n` +
      `Do you want to proceed with the download?`
    );

    if (!confirmDownload) {
      return;
    }

    try {
      console.log("Downloading resident details for:", residentId);
      const originalError = error;
      setError("Generating PDF report... Please wait.");

      const response = await fetch(
        `/api/residents/${residentId}/download?format=pdf&template=detailed`
      );

      console.log("Download response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error response:", errorText);
        throw new Error(
          `Download failed with status ${response.status}: ${errorText}`
        );
      }

      const blob = await response.blob();
      console.log("Downloaded blob size:", blob.size, "bytes");

      setError(originalError);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resident-${registrationNo || residentId}-details.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Resident details downloaded successfully as PDF");
      const tempError = error;
      setError("PDF downloaded successfully!");
      setTimeout(() => setError(tempError), 3000);
    } catch (error) {
      console.error("Download error:", error);
      setError(`Failed to download resident details: ${error.message}`);
    }
  };

  // Print individual resident details
  const printResidentDetails = async (
    residentId,
    registrationNo,
    residentName
  ) => {
    try {
      console.log("Preparing to print resident details for:", residentId);
      const originalError = error;
      setError("Preparing PDF for printing... Please wait.");

      const printUrl = `/api/residents/${residentId}/print?template=detailed`;
      const printWindow = window.open(
        printUrl,
        "_blank",
        "width=800,height=600"
      );

      if (printWindow) {
        setError(originalError);
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            console.log("Print dialog opened successfully");
            const tempError = error;
            setError("Print dialog opened successfully!");
            setTimeout(() => setError(tempError), 3000);
          }, 1000);
        };
      } else {
        setError("Pop-up blocked. Please allow pop-ups for printing.");
      }
    } catch (error) {
      console.error("Print error:", error);
      setError(`Failed to prepare PDF for printing: ${error.message}`);
    }
  };

  // Preview resident details as PDF
  const previewResidentDetails = async (
    residentId,
    residentName,
    registrationNo
  ) => {
    try {
      setPreviewResident({ name: residentName, registrationNo });
      const previewUrl = `/api/residents/${residentId}/preview`;
      setPreviewUrl(previewUrl);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Preview error:", error);
      setError(`Failed to preview resident details: ${error.message}`);
    }
  };

  // Close preview modal
  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewUrl("");
    setPreviewResident(null);
  };

  // Close details modal
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedResident(null);
  };

  // Handle delete confirmation
  const handleDeleteClick = (resident) => {
    setShowDeleteConfirm(resident);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteResident(showDeleteConfirm._id);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Delete Confirmation Modal
  const DeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">
            Confirm Delete
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete resident "{showDeleteConfirm.name}"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              disabled={deleteLoading === showDeleteConfirm._id}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteLoading === showDeleteConfirm._id}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading === showDeleteConfirm._id
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update Resident Modal Component
  const UpdateResidentModal = () => {
    if (!showUpdateModal || !updateResident) return null;

    const formatDateForInput = (dateValue) => {
      if (!dateValue) return "";
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Date formatting error:", error);
        return "";
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-gray-50 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          key={updateResident._id}
        >
          {/* Modal Header */}
          <div className="bg-white p-6 border-b border-gray-200 rounded-t-lg shadow-sm flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Update Resident Information
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {updateResident.name ||
                    updateResident.nameGivenByOrganization}{" "}
                  - {updateResident.registrationNo}
                </p>
                {changedFields.size > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {changedFields.size} field{changedFields.size > 1 ? "s" : ""} modified
                  </p>
                )}
              </div>
              <button
                onClick={closeUpdateModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div
            className="p-6 space-y-6 overflow-y-auto flex-1"
            style={{
              scrollBehavior: 'auto'
            }}
          >
            {/* Error Display */}
            {error && error.includes("updated successfully") ? (
              <div
                className="alert alert-success d-flex align-items-center"
                role="alert"
              >
                <svg
                  className="bi flex-shrink-0 me-2"
                  width="24"
                  height="24"
                  role="img"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                </svg>
                <div>{error}</div>
              </div>
            ) : error && !error.includes("updated successfully") && !error.includes("No changes detected") ? (
              <div
                className="alert alert-danger d-flex align-items-center"
                role="alert"
              >
                <svg
                  className="bi flex-shrink-0 me-2"
                  width="24"
                  height="24"
                  role="img"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <div>{error}</div>
              </div>
            ) : error && error.includes("No changes detected") ? (
              <div
                className="alert alert-warning d-flex align-items-center"
                role="alert"
              >
                <svg
                  className="bi flex-shrink-0 me-2"
                  width="24"
                  height="24"
                  role="img"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <div>{error}</div>
              </div>
            ) : null}

            {/* Basic Information Section */}
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
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Registration Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.registrationNo || ""}
                    onChange={(e) => handleFormInputChange("registrationNo", e.target.value)}
                    placeholder="Registration number"
                    disabled
                    style={{ backgroundColor: '#f8f9fa' }}
                  />
                  <small className="text-muted">Registration number cannot be changed</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Admission Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formatDateForInput(formData.admissionDate)}
                    onChange={(e) => handleFormInputChange("admissionDate", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name || ""}
                    onChange={(e) => handleFormInputChange("name", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Name Given by Organization
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nameGivenByOrganization || ""}
                    onChange={(e) => handleFormInputChange("nameGivenByOrganization", e.target.value)}
                    placeholder="Organization assigned name"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formatDateForInput(formData.dateOfBirth)}
                    onChange={(e) => handleFormInputChange("dateOfBirth", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Age
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.age || ""}
                    onChange={(e) => handleFormInputChange("age", e.target.value)}
                    placeholder="Age in years"
                    min="0"
                    max="150"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Gender
                  </label>
                  <select
                    className="form-select"
                    value={formData.gender || ""}
                    onChange={(e) => handleFormInputChange("gender", e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.weight || ""}
                    onChange={(e) => handleFormInputChange("weight", e.target.value)}
                    placeholder="Weight in kg"
                    min="0"
                    max="500"
                    step="0.1"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.height || ""}
                    onChange={(e) => handleFormInputChange("height", e.target.value)}
                    placeholder="Height in cm"
                    min="0"
                    max="300"
                    step="0.1"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Religion
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.religion || ""}
                    onChange={(e) => handleFormInputChange("religion", e.target.value)}
                    placeholder="Religion"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Identification Mark
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.identificationMark || ""}
                    onChange={(e) => handleFormInputChange("identificationMark", e.target.value)}
                    placeholder="Any identifying marks or features"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Contact Information
              </h3>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.mobileNo || ""}
                    onChange={(e) => handleFormInputChange("mobileNo", e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Alternative Contact
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phoneNumber || formData.alternativeContact || ""}
                    onChange={(e) => handleFormInputChange("phoneNumber", e.target.value)}
                    placeholder="Alternative contact number"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.emailAddress || ""}
                    onChange={(e) => handleFormInputChange("emailAddress", e.target.value)}
                    placeholder="Email address"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Social Media Handle
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.socialMediaHandle || ""}
                    onChange={(e) => handleFormInputChange("socialMediaHandle", e.target.value)}
                    placeholder="Social media profile"
                  />
                </div>
                
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Relative Who Admitted
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.relativeAdmit || ""}
                    onChange={(e) => handleFormInputChange("relativeAdmit", e.target.value)}
                    placeholder="Name of relative who admitted"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Relation with Admitter
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.relationWith || ""}
                    onChange={(e) => handleFormInputChange("relationWith", e.target.value)}
                    placeholder="Relationship with person who admitted"
                  />
                </div>

                {/* Emergency Contact */}
                <div className="col-12 mt-4">
                  <h5 className="text-danger mb-3">
                    Emergency Contact
                  </h5>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.emergencyContactName || ""}
                    onChange={(e) => handleFormInputChange("emergencyContactName", e.target.value)}
                    placeholder="Emergency contact person"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.emergencyContactNumber || ""}
                    onChange={(e) => handleFormInputChange("emergencyContactNumber", e.target.value)}
                    placeholder="Emergency contact number"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Emergency Contact Relationship
                  </label>
                  <select
                    className="form-select"
                    value={formData.emergencyContactRelationship || ""}
                    onChange={(e) => handleFormInputChange("emergencyContactRelationship", e.target.value)}
                  >
                    <option value="">Select Relationship</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Social Worker">Social Worker</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Identity Documents */}
                <div className="col-12 mt-4">
                  <h5 className="text-info mb-3">
                    Identity Documents
                  </h5>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Voter ID
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.voterId || ""}
                    onChange={(e) => handleFormInputChange("voterId", e.target.value)}
                    placeholder="Voter ID number"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.aadhaarNumber || ""}
                    onChange={(e) => handleFormInputChange("aadhaarNumber", e.target.value)}
                    placeholder="12-digit Aadhaar number"
                    maxLength="12"
                    pattern="[0-9]{12}"
                  />
                </div>
              </div>
            </div>

            {/* Health Information Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
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
                {/* General Health Status */}
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Health Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.healthStatus || ""}
                    onChange={(e) => handleFormInputChange("healthStatus", e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Critical">Critical</option>
                    <option value="Stable">Stable</option>
                    <option value="Improving">Improving</option>
                    <option value="Declining">Declining</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Blood Group
                  </label>
                  <select
                    className="form-select"
                    value={formData.bloodGroup || ""}
                    onChange={(e) => handleFormInputChange("bloodGroup", e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Category
                  </label>
                  <select
                    className="form-select"
                    value={formData.category || ""}
                    onChange={(e) => handleFormInputChange("category", e.target.value)}
                  >
                    <option value="">Select Category</option>
                    <option value="Other">Other</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>

                {/* Vital Signs */}
                <div className="col-12 mt-4">
                  <h5 className="text-info mb-3">
                    Vital Signs & Physical Metrics
                  </h5>
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Body Temperature (°C)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.bodyTemperature || ""}
                    onChange={(e) => handleFormInputChange("bodyTemperature", e.target.value)}
                    placeholder="Normal: 36.5-37.5"
                    min="30"
                    max="45"
                    step="0.1"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.heartRate || ""}
                    onChange={(e) => handleFormInputChange("heartRate", e.target.value)}
                    placeholder="Normal: 60-100"
                    min="40"
                    max="200"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.respiratoryRate || ""}
                    onChange={(e) => handleFormInputChange("respiratoryRate", e.target.value)}
                    placeholder="Normal: 12-20"
                    min="10"
                    max="60"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.bloodPressure || ""}
                    onChange={(e) => handleFormInputChange("bloodPressure", e.target.value)}
                    placeholder="e.g., 120/80"
                  />
                </div>

                {/* Disability and Medical History */}
                <div className="col-12 mt-4">
                  <h5 className="text-warning mb-3">
                    Disability & Medical History
                  </h5>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Disability Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.disabilityStatus || ""}
                    onChange={(e) => handleFormInputChange("disabilityStatus", e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="None">No Disability</option>
                    <option value="Physical">Physical Disability</option>
                    <option value="Mental">Mental Disability</option>
                    <option value="Intellectual">Intellectual Disability</option>
                    <option value="Sensory">Sensory Disability</option>
                    <option value="Multiple">Multiple Disabilities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Rehabilitation Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.rehabStatus || ""}
                    onChange={(e) => handleFormInputChange("rehabStatus", e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Not Required">Not Required</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Discontinued">Discontinued</option>
                    <option value="Required but not started">Required but not started</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Disability Details
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.disabilityDetails || ""}
                    onChange={(e) => handleFormInputChange("disabilityDetails", e.target.value)}
                    placeholder="Detailed description of disability, limitations, or special needs"
                  />
                </div>

                {/* Allergies and Medical Conditions */}
                <div className="col-12 mt-4">
                  <h5 className="text-danger mb-3">
                    Allergies & Medical Conditions
                  </h5>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Known Allergies
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.allergies || ""}
                    onChange={(e) => handleFormInputChange("allergies", e.target.value)}
                    placeholder="List any known allergies (food, medication, environmental)"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Medical Conditions
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.medicalConditions || ""}
                    onChange={(e) => handleFormInputChange("medicalConditions", e.target.value)}
                    placeholder="Current medical conditions, chronic illnesses, past surgeries"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Current Medications
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.medications || ""}
                    onChange={(e) => handleFormInputChange("medications", e.target.value)}
                    placeholder="List current medications with dosage and frequency"
                  />
                </div>

                {/* Additional Health Information */}
                <div className="col-12 mt-4">
                  <h5 className="text-success mb-3">
                    Additional Health Information
                  </h5>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Primary Doctor
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.primaryDoctor || ""}
                    onChange={(e) => handleFormInputChange("primaryDoctor", e.target.value)}
                    placeholder="Name of primary doctor"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Preferred Hospital
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.preferredHospital || ""}
                    onChange={(e) => handleFormInputChange("preferredHospital", e.target.value)}
                    placeholder="Preferred hospital for treatment"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Medical History Notes
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.medicalHistory || ""}
                    onChange={(e) => handleFormInputChange("medicalHistory", e.target.value)}
                    placeholder="Additional medical history, family history, or important notes"
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Address Information
              </h3>
              <div className="row g-4">
                {/* Current Address */}
                <div className="col-12">
                  <h5 className="text-primary mb-3">
                    Current/Permanent Address
                  </h5>
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Full Address
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.address?.fullAddress || ""}
                    onChange={(e) => handleFormInputChange("address.fullAddress", e.target.value)}
                    placeholder="Complete address with house number, street, area, landmarks"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    City/Town
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address?.city || ""}
                    onChange={(e) => handleFormInputChange("address.city", e.target.value)}
                    placeholder="City or town name"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    District
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address?.district || ""}
                    onChange={(e) => handleFormInputChange("address.district", e.target.value)}
                    placeholder="District name"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    State
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address?.state || ""}
                    onChange={(e) => handleFormInputChange("address.state", e.target.value)}
                    placeholder="State name"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Country
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address?.country || "India"}
                    onChange={(e) => handleFormInputChange("address.country", e.target.value)}
                    placeholder="Country"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address?.pincode || ""}
                    onChange={(e) => handleFormInputChange("address.pincode", e.target.value)}
                    placeholder="6-digit PIN code"
                    maxLength="6"
                    pattern="[0-9]{6}"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.address?.latitude || ""}
                    onChange={(e) => handleFormInputChange("address.latitude", e.target.value)}
                    placeholder="GPS Latitude"
                    step="0.000001"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.address?.longitude || ""}
                    onChange={(e) => handleFormInputChange("address.longitude", e.target.value)}
                    placeholder="GPS Longitude"
                    step="0.000001"
                  />
                </div>

                {/* Alternative/Emergency Address */}
                <div className="col-12 mt-4">
                  <h5 className="text-secondary mb-3">
                    Alternative/Emergency Address
                  </h5>
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Alternative Address
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.alternativeAddress || ""}
                    onChange={(e) => handleFormInputChange("alternativeAddress", e.target.value)}
                    placeholder="Alternative contact address (if different from permanent address)"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Nearest Landmark
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nearestLandmark || ""}
                    onChange={(e) => handleFormInputChange("nearestLandmark", e.target.value)}
                    placeholder="Nearest landmark for easy location"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Distance from Facility (km)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.distanceFromFacility || ""}
                    onChange={(e) => handleFormInputChange("distanceFromFacility", e.target.value)}
                    placeholder="Distance in kilometers"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Informer Information Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Informer Information
              </h3>
              <div className="row g-4">
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Informer Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.informerName || ""}
                    onChange={(e) => handleFormInputChange("informerName", e.target.value)}
                    placeholder="Name of person who provided information"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Informer Mobile
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.informerMobile || ""}
                    onChange={(e) => handleFormInputChange("informerMobile", e.target.value)}
                    placeholder="Informer's mobile number"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Relationship to Resident
                  </label>
                  <select
                    className="form-select"
                    value={formData.informerRelationship || ""}
                    onChange={(e) => handleFormInputChange("informerRelationship", e.target.value)}
                  >
                    <option value="">Select Relationship</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Friend">Friend</option>
                    <option value="Neighbor">Neighbor</option>
                    <option value="Social Worker">Social Worker</option>
                    <option value="Police">Police</option>
                    <option value="Hospital Staff">Hospital Staff</option>
                    <option value="Government Official">Government Official</option>
                    <option value="NGO Worker">NGO Worker</option>
                    <option value="Self">Self</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Information Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formatDateForInput(formData.informationDate)}
                    onChange={(e) => handleFormInputChange("informationDate", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Informer Address
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.informerAddress || ""}
                    onChange={(e) => handleFormInputChange("informerAddress", e.target.value)}
                    placeholder="Informer's address"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Information Details
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.informationDetails || ""}
                    onChange={(e) => handleFormInputChange("informationDetails", e.target.value)}
                    placeholder="Details about how and why this information was provided"
                  />
                </div>
              </div>
            </div>

            {/* Transport & Organization Information Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Transport & Organization Information
              </h3>
              <div className="row g-4">
                {/* Transport Details */}
                <div className="col-12">
                  <h5 className="text-info mb-3">
                    Transport Details
                  </h5>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.conveyanceVehicleNo || ""}
                    onChange={(e) => handleFormInputChange("conveyanceVehicleNo", e.target.value)}
                    placeholder="Transport vehicle number"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Driver Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.driverName || ""}
                    onChange={(e) => handleFormInputChange("driverName", e.target.value)}
                    placeholder="Driver's full name"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.driverMobile || ""}
                    onChange={(e) => handleFormInputChange("driverMobile", e.target.value)}
                    placeholder="Driver's mobile number"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Pick Up Place
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.pickUpPlace || ""}
                    onChange={(e) => handleFormInputChange("pickUpPlace", e.target.value)}
                    placeholder="Location where resident was picked up"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Pick Up Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.pickUpTime ? new Date(formData.pickUpTime).toISOString().slice(0, 16) : ""}
                    onChange={(e) => handleFormInputChange("pickUpTime", e.target.value)}
                  />
                </div>

                {/* Organization Details */}
                <div className="col-12 mt-4">
                  <h5 className="text-success mb-3">
                    Organization & Admission Details
                  </h5>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Admitted By
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.admittedBy || ""}
                    onChange={(e) => handleFormInputChange("admittedBy", e.target.value)}
                    placeholder="Name of admitting officer"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Data Entrant Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.entrantName || ""}
                    onChange={(e) => handleFormInputChange("entrantName", e.target.value)}
                    placeholder="Name of person who entered data"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Ward Assignment
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.ward || ""}
                    onChange={(e) => handleFormInputChange("ward", e.target.value)}
                    placeholder="Ward or room assignment"
                  />
                </div>

                {/* Financial & Documentation */}
                <div className="col-12 mt-4">
                  <h5 className="text-warning mb-3">
                    Financial & Documentation
                  </h5>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.receiptNo || ""}
                    onChange={(e) => handleFormInputChange("receiptNo", e.target.value)}
                    placeholder="Financial receipt number"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Letter Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.letterNo || ""}
                    onChange={(e) => handleFormInputChange("letterNo", e.target.value)}
                    placeholder="Official letter number"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Item Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.itemAmount || ""}
                    onChange={(e) => handleFormInputChange("itemAmount", e.target.value)}
                    placeholder="Value of items/money"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Item Description
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.itemDescription || ""}
                    onChange={(e) => handleFormInputChange("itemDescription", e.target.value)}
                    placeholder="Detailed description of personal belongings, money, or items found with resident"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Video Documentation
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    value={formData.videoUrl || ""}
                    onChange={(e) => handleFormInputChange("videoUrl", e.target.value)}
                    placeholder="Link to video documentation"
                  />
                  <small className="text-muted">Link to any video documentation of admission</small>
                </div>

                {/* Additional Organization Fields */}
                <div className="col-12 mt-4">
                  <h5 className="text-secondary mb-3">
                    Additional Information
                  </h5>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Organization ID
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.organizationId || ""}
                    onChange={(e) => handleFormInputChange("organizationId", e.target.value)}
                    placeholder="Internal organization ID"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Admission Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.admissionStatus || ""}
                    onChange={(e) => handleFormInputChange("admissionStatus", e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Discharged">Discharged</option>
                    <option value="Transferred">Transferred</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Absconded">Absconded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="p-5 rounded-3 jumbotron mt-4 shadow-sm bg-white">
              <h3
                className="heading mb-4"
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#0A400C",
                }}
              >
                Additional Comments & Notes
              </h3>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    General Comments
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.comments || ""}
                    onChange={(e) => handleFormInputChange("comments", e.target.value)}
                    placeholder="General notes, observations, or important information about the resident..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Medical Notes
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={formData.medicalNotes || ""}
                    onChange={(e) => handleFormInputChange("medicalNotes", e.target.value)}
                    placeholder="Specific medical observations, treatment notes, or health concerns..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Behavioral Notes
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.behavioralNotes || ""}
                    onChange={(e) => handleFormInputChange("behavioralNotes", e.target.value)}
                    placeholder="Behavioral patterns, social interactions, special needs..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Care Instructions
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.careInstructions || ""}
                    onChange={(e) => handleFormInputChange("careInstructions", e.target.value)}
                    placeholder="Special care instructions, restrictions, or precautions..."
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Priority Level
                  </label>
                  <select
                    className="form-select"
                    value={formData.priorityLevel || ""}
                    onChange={(e) => handleFormInputChange("priorityLevel", e.target.value)}
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Last Update Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formatDateForInput(formData.lastUpdateDate) || new Date().toISOString().split("T")[0]}
                    onChange={(e) => handleFormInputChange("lastUpdateDate", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Updated By
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.updatedBy || ""}
                    onChange={(e) => handleFormInputChange("updatedBy", e.target.value)}
                    placeholder="Name of person making this update"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Update Summary
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.updateSummary || ""}
                    onChange={(e) => handleFormInputChange("updateSummary", e.target.value)}
                    placeholder="Brief summary of changes made in this update..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 rounded-3 jumbotron mt-0 shadow-sm bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-sm text-gray-600">
                {changedFields.size > 0 ? (
                  <span className="text-blue-600">
                    {changedFields.size} field{changedFields.size > 1 ? "s" : ""} will be updated
                  </span>
                ) : (
                  <span>No changes detected</span>
                )}
              </div>
              <div className="d-flex gap-3">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="btn btn-secondary px-4"
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={updateResidentData}
                  disabled={updateLoading || changedFields.size === 0}
                  className={`btn px-4 ${changedFields.size === 0 ? 'btn-outline-secondary' : ''}`}
                  style={changedFields.size > 0 ? {
                    backgroundColor: "#0A400C",
                    color: "white",
                    fontWeight: 600,
                  } : {}}
                >
                  {updateLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit size={16} className="me-2" />
                      {changedFields.size > 0 ? `Update ${changedFields.size} Field${changedFields.size > 1 ? "s" : ""}` : "No Changes to Save"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Resident Details Modal Component - UPDATED TO SHOW ALL FIELDS AND PHOTOS
  const ResidentDetailsModal = () => {
    if (!selectedResident) return null;

    const formatDate = (dateString) => {
      return dateString ? new Date(dateString).toLocaleDateString("en-IN") : "N/A";
    };

    const formatAddress = (address) => {
      if (!address) return "N/A";
      const parts = [];
      if (address.fullAddress) parts.push(address.fullAddress);
      if (address.city) parts.push(address.city);
      if (address.district) parts.push(address.district);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      if (address.pincode) parts.push(`PIN: ${address.pincode}`);
      return parts.join(", ") || "N/A";
    };

    // Handle image loading errors
    const handleImageError = (e) => {
      console.error("Failed to load image:", e.target.src);
      e.target.style.display = "none";
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto mt-5">
          <div className="sticky top-0 bg-white p-6 border-b shadow-sm z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedResident.nameGivenByOrganization ||
                    selectedResident.name ||
                    "N/A"}
                </h2>
                <p className="text-gray-600 mt-1">
                  Registration No: {selectedResident.registrationNo || "N/A"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Admission Date: {formatDate(selectedResident.admissionDate)}
                </p>
              </div>

              {/* Photos & Action buttons */}
              <div className="flex items-start space-x-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      downloadResidentDetails(
                        selectedResident._id,
                        selectedResident.registrationNo,
                        selectedResident.nameGivenByOrganization ||
                          selectedResident.name
                      )
                    }
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    title="Download Details"
                  >
                    <Download size={16} className="mr-1" />
                    Download
                  </button>

                  <button
                    onClick={() =>
                      printResidentDetails(
                        selectedResident._id,
                        selectedResident.registrationNo,
                        selectedResident.nameGivenByOrganization ||
                          selectedResident.name
                      )
                    }
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    title="Print Details"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print
                  </button>
                </div>

                {/* Photo Before Admission */}
                {selectedResident.photoBeforeAdmission ? (
                  <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center mb-1">Before Admission</p>
                    <img
                      src={selectedResident.photoBeforeAdmission}
                      alt="Before Admission"
                      className="w-20 h-20 object-cover rounded-lg shadow-lg border-2 border-gray-200"
                      onError={handleImageError}
                      onLoad={(e) => (e.target.style.display = "block")}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center mb-1">Before Admission</p>
                    <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg shadow-lg border-2 border-gray-200">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  </div>
                )}

                {/* Photo After Admission */}
                {selectedResident.photoAfterAdmission ? (
                  <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center mb-1">After Admission</p>
                    <img
                      src={selectedResident.photoAfterAdmission}
                      alt="After Admission"
                      className="w-20 h-20 object-cover rounded-lg shadow-lg border-2 border-gray-200"
                      onError={handleImageError}
                      onLoad={(e) => (e.target.style.display = "block")}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center mb-1">After Admission</p>
                    <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg shadow-lg border-2 border-gray-200">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  </div>
                )}

                {/* Legacy Photo (if no before/after photos) */}
                {!selectedResident.photoBeforeAdmission && !selectedResident.photoAfterAdmission && selectedResident.photoUrl && (
                  <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center mb-1">Photo</p>
                    <img
                      src={selectedResident.photoUrl}
                      alt="Resident"
                      className="w-20 h-20 object-cover rounded-lg shadow-lg border-2 border-gray-200"
                      onError={handleImageError}
                      onLoad={(e) => (e.target.style.display = "block")}
                    />
                  </div>
                )}

                <button
                  onClick={closeDetails}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Basic Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <strong>Registration No:</strong>{" "}
                  {selectedResident.registrationNo || "N/A"}
                </div>
                <div>
                  <strong>Admission Date:</strong>{" "}
                  {formatDate(selectedResident.admissionDate)}
                </div>
                <div>
                  <strong>Name:</strong> {selectedResident.name || "N/A"}
                </div>
                <div>
                  <strong>Organization Name:</strong>{" "}
                  {selectedResident.nameGivenByOrganization || "N/A"}
                </div>
                <div>
                  <strong>Date of Birth:</strong>{" "}
                  {formatDate(selectedResident.dateOfBirth)}
                </div>
                <div>
                  <strong>Gender:</strong> {selectedResident.gender || "N/A"}
                </div>
                <div>
                  <strong>Age:</strong> {selectedResident.age || "N/A"} years
                </div>
                <div>
                  <strong>Weight:</strong> {selectedResident.weight || "N/A"} kg
                </div>
                <div>
                  <strong>Height:</strong> {selectedResident.height || "N/A"} cm
                </div>
                <div>
                  <strong>Religion:</strong> {selectedResident.religion || "N/A"}
                </div>
                <div>
                  <strong>Identification Mark:</strong>{" "}
                  {selectedResident.identificationMark || "N/A"}
                </div>
                <div>
                  <strong>Category:</strong> {selectedResident.category || "N/A"}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-green-800 border-b pb-2">
                Contact & Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Full Address:</strong>{" "}
                  {formatAddress(selectedResident.address)}
                </div>
                <div>
                  <strong>Mobile No:</strong> {selectedResident.mobileNo || "N/A"}
                </div>
                <div>
                  <strong>Alternative Contact:</strong> {selectedResident.alternativeContact || "N/A"}
                </div>
                <div>
                  <strong>Email:</strong> {selectedResident.emailAddress || "N/A"}
                </div>
                <div>
                  <strong>Voter ID:</strong> {selectedResident.voterId || "N/A"}
                </div>
                <div>
                  <strong>Aadhaar Number:</strong> {selectedResident.aadhaarNumber || "N/A"}
                </div>
              </div>
            </div>

            {/* Guardian & Family Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-800 border-b pb-2">
                Guardian & Family Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Guardian Name:</strong> {selectedResident.guardianName || "N/A"}
                </div>
                <div>
                  <strong>Relative Who Admitted:</strong>{" "}
                  {selectedResident.relativeAdmit || "N/A"}
                </div>
                <div>
                  <strong>Relationship:</strong>{" "}
                  {selectedResident.relationWith || "N/A"}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-red-800 border-b pb-2">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <strong>Emergency Contact Name:</strong>{" "}
                  {selectedResident.emergencyContactName || "N/A"}
                </div>
                <div>
                  <strong>Emergency Contact Number:</strong>{" "}
                  {selectedResident.emergencyContactNumber || "N/A"}
                </div>
                <div>
                  <strong>Relationship:</strong>{" "}
                  {selectedResident.emergencyContactRelationship || "N/A"}
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-red-800 border-b pb-2">
                Health Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Health Status:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-sm ${
                      selectedResident.healthStatus
                        ?.toLowerCase()
                        .includes("good")
                        ? "bg-green-100 text-green-800"
                        : selectedResident.healthStatus
                            ?.toLowerCase()
                            .includes("critical")
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedResident.healthStatus || "N/A"}
                  </span>
                </div>
                <div>
                  <strong>Blood Group:</strong>{" "}
                  {selectedResident.bloodGroup || "N/A"}
                </div>
                <div>
                  <strong>Disability Status:</strong>{" "}
                  {selectedResident.disabilityStatus || "None"}
                </div>
                <div>
                  <strong>Rehabilitation Status:</strong>{" "}
                  {selectedResident.rehabStatus || "N/A"}
                </div>
              </div>
              
              {/* Vital Signs */}
              {(selectedResident.bodyTemperature || selectedResident.heartRate || selectedResident.respiratoryRate || selectedResident.bloodPressure) && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2 text-blue-700">Vital Signs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <strong>Body Temperature:</strong> {selectedResident.bodyTemperature ? `${selectedResident.bodyTemperature}°C` : "N/A"}
                    </div>
                    <div>
                      <strong>Heart Rate:</strong> {selectedResident.heartRate ? `${selectedResident.heartRate} BPM` : "N/A"}
                    </div>
                    <div>
                      <strong>Respiratory Rate:</strong> {selectedResident.respiratoryRate ? `${selectedResident.respiratoryRate}/min` : "N/A"}
                    </div>
                    <div>
                      <strong>Blood Pressure:</strong> {selectedResident.bloodPressure || "N/A"}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Details */}
              <div className="mt-4 grid grid-cols-1 gap-4">
                {selectedResident.allergies && (
                  <div>
                    <strong>Known Allergies:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.allergies}</p>
                  </div>
                )}
                {selectedResident.knownAllergies && (
                  <div>
                    <strong>Additional Allergies:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.knownAllergies}</p>
                  </div>
                )}
                {selectedResident.medicalConditions && (
                  <div>
                    <strong>Medical Conditions:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.medicalConditions}</p>
                  </div>
                )}
                {selectedResident.medications && (
                  <div>
                    <strong>Current Medications:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.medications}</p>
                  </div>
                )}
                {selectedResident.disabilityDetails && (
                  <div>
                    <strong>Disability Details:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.disabilityDetails}</p>
                  </div>
                )}
                {selectedResident.medicalHistoryNotes && (
                  <div>
                    <strong>Medical History Notes:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.medicalHistoryNotes}</p>
                  </div>
                )}
                {selectedResident.medicalHistory && (
                  <div>
                    <strong>Medical History:</strong> 
                    <p className="mt-1 text-gray-700">{selectedResident.medicalHistory}</p>
                  </div>
                )}
                {selectedResident.primaryDoctor && (
                  <div>
                    <strong>Primary Doctor:</strong> {selectedResident.primaryDoctor}
                  </div>
                )}
                {selectedResident.preferredHospital && (
                  <div>
                    <strong>Preferred Hospital:</strong> {selectedResident.preferredHospital}
                  </div>
                )}
              </div>
            </div>

            {/* Informer Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-800 border-b pb-2">
                Informer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Informer Name:</strong>{" "}
                  {selectedResident.informerName || "N/A"}
                </div>
                <div>
                  <strong>Informer Mobile:</strong>{" "}
                  {selectedResident.informerMobile || "N/A"}
                </div>
                <div>
                  <strong>Informer Relationship:</strong>{" "}
                  {selectedResident.informerRelationship || "N/A"}
                </div>
                <div>
                  <strong>Information Date:</strong>{" "}
                  {formatDate(selectedResident.informationDate)}
                </div>
                <div>
                  <strong>Informer Address:</strong>{" "}
                  {selectedResident.informerAddress || "N/A"}
                </div>
              </div>
              {selectedResident.informationDetails && (
                <div className="mt-4">
                  <strong>Information Details:</strong>
                  <p className="mt-1 text-gray-700">{selectedResident.informationDetails}</p>
                </div>
              )}
            </div>

            {/* Transport & Organization */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-800 border-b pb-2">
                Transport & Organization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Vehicle No:</strong>{" "}
                  {selectedResident.conveyanceVehicleNo || "N/A"}
                </div>
                <div>
                  <strong>Pick Up Place:</strong>{" "}
                  {selectedResident.pickUpPlace || "N/A"}
                </div>
                <div>
                  <strong>Pick Up Time:</strong>{" "}
                  {selectedResident.pickUpTime ? new Date(selectedResident.pickUpTime).toLocaleString("en-IN") : "N/A"}
                </div>
                <div>
                  <strong>Driver Name:</strong>{" "}
                  {selectedResident.driverName || "N/A"}
                </div>
                <div>
                  <strong>Driver Mobile:</strong>{" "}
                  {selectedResident.driverMobile || "N/A"}
                </div>
                <div>
                  <strong>Entrant Name:</strong>{" "}
                  {selectedResident.entrantName || "N/A"}
                </div>
                <div>
                  <strong>Admitted By:</strong>{" "}
                  {selectedResident.admittedBy || "N/A"}
                </div>
                <div>
                  <strong>Ward:</strong> {selectedResident.ward || "N/A"}
                </div>
                <div>
                  <strong>Organization ID:</strong>{" "}
                  {selectedResident.organizationId || "N/A"}
                </div>
                <div>
                  <strong>Admission Status:</strong>{" "}
                  <span className={`px-2 py-1 rounded text-sm ${
                    selectedResident.admissionStatus === "Active" ? "bg-green-100 text-green-800" :
                    selectedResident.admissionStatus === "Discharged" ? "bg-gray-100 text-gray-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {selectedResident.admissionStatus || "N/A"}
                  </span>
                </div>
              </div>
              {selectedResident.transportNotes && (
                <div className="mt-4">
                  <strong>Transport Notes:</strong>
                  <p className="mt-1 text-gray-700">{selectedResident.transportNotes}</p>
                </div>
              )}
            </div>

            {/* Financial & Documentation */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-yellow-800 border-b pb-2">
                Financial & Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Receipt No:</strong>{" "}
                  {selectedResident.receiptNo || "N/A"}
                </div>
                <div>
                  <strong>Letter No:</strong>{" "}
                  {selectedResident.letterNo || "N/A"}
                </div>
                <div>
                  <strong>Item Amount:</strong> ₹{selectedResident.itemAmount || 0}
                </div>
                <div>
                  <strong>Video URL:</strong>
                  {selectedResident.videoUrl ? (
                    <a
                      href={selectedResident.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      View Video
                    </a>
                  ) : (
                    " N/A"
                  )}
                </div>
              </div>
              {selectedResident.itemDescription && (
                <div className="mt-4">
                  <strong>Item Description:</strong>
                  <p className="mt-1 text-gray-700">{selectedResident.itemDescription}</p>
                </div>
              )}
            </div>

            {/* Comments & Notes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-indigo-800 border-b pb-2">
                Comments & Notes
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {selectedResident.comments && (
                  <div>
                    <strong>General Comments:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.comments}</p>
                  </div>
                )}
                {selectedResident.generalComments && (
                  <div>
                    <strong>Additional Comments:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.generalComments}</p>
                  </div>
                )}
                {selectedResident.medicalNotes && (
                  <div>
                    <strong>Medical Notes:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.medicalNotes}</p>
                  </div>
                )}
                {selectedResident.behavioralNotes && (
                  <div>
                    <strong>Behavioral Notes:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.behavioralNotes}</p>
                  </div>
                )}
                {selectedResident.careInstructions && (
                  <div>
                    <strong>Care Instructions:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.careInstructions}</p>
                  </div>
                )}
                {selectedResident.priorityLevel && (
                  <div>
                    <strong>Priority Level:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      selectedResident.priorityLevel === "Critical" || selectedResident.priorityLevel === "Emergency"
                        ? "bg-red-100 text-red-800"
                        : selectedResident.priorityLevel === "High"
                        ? "bg-orange-100 text-orange-800"
                        : selectedResident.priorityLevel === "Low"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {selectedResident.priorityLevel}
                    </span>
                  </div>
                )}
                {selectedResident.updateSummary && (
                  <div>
                    <strong>Last Update Summary:</strong>
                    <p className="mt-1 text-gray-700">{selectedResident.updateSummary}</p>
                  </div>
                )}
                {selectedResident.updatedBy && (
                  <div>
                    <strong>Updated By:</strong> {selectedResident.updatedBy}
                  </div>
                )}
                {selectedResident.lastUpdateDate && (
                  <div>
                    <strong>Last Update Date:</strong> {formatDate(selectedResident.lastUpdateDate)}
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-indigo-800 border-b pb-2">
                Documents
              </h3>
              {selectedResident.documentIds && selectedResident.documentIds.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedResident.documentIds.map((doc) => (
                    <li key={doc._id} className="text-sm text-gray-900">
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {doc.name} ({doc.type})
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No documents available.</p>
              )}
            </div>

            {/* Care Events (if any) */}
            {selectedResident.careEvents && selectedResident.careEvents.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-pink-800 border-b pb-2">
                  Care Events History
                </h3>
                <div className="space-y-4">
                  {selectedResident.careEvents.slice(0, 5).map((event, index) => (
                    <div key={index} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50 rounded-r">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <strong className="text-blue-700">{event.type}</strong>
                          <span className="ml-2 text-sm text-gray-600">
                            {formatDate(event.date)}
                          </span>
                        </div>
                        {event.status && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            event.status === "Completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{event.description}</p>
                      {event.doctor && (
                        <p className="text-sm text-gray-600"><strong>Doctor:</strong> {event.doctor}</p>
                      )}
                      {event.medications && (
                        <p className="text-sm text-gray-600"><strong>Medications:</strong> {event.medications}</p>
                      )}
                      {event.nextVisit && (
                        <p className="text-sm text-gray-600"><strong>Next Visit:</strong> {formatDate(event.nextVisit)}</p>
                      )}
                      {event.remarks && (
                        <p className="text-sm text-gray-600"><strong>Remarks:</strong> {event.remarks}</p>
                      )}
                    </div>
                  ))}
                  {selectedResident.careEvents.length > 5 && (
                    <p className="text-sm text-gray-600 italic">
                      ... and {selectedResident.careEvents.length - 5} more care events
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* System Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Created At:</strong> {formatDate(selectedResident.createdAt)}
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(selectedResident.updatedAt)}
                </div>
                <div>
                  <strong>Active Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    selectedResident.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {selectedResident.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // PDF Preview Modal Component
  const PDFPreviewModal = () => {
    if (!isPreviewOpen || !previewUrl) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  PDF Preview
                </h3>
                {previewResident && (
                  <p className="text-green-100 text-sm">
                    {previewResident.name} - {previewResident.registrationNo}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (previewResident) {
                    downloadResidentDetails(
                      previewUrl.split("/")[5],
                      previewResident.registrationNo,
                      previewResident.name
                    );
                  }
                }}
                className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 flex items-center space-x-1"
              >
                <Download size={16} />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  if (previewResident) {
                    printResidentDetails(
                      previewUrl.split("/")[5],
                      previewResident.registrationNo,
                      previewResident.name
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print</span>
              </button>
              <button
                onClick={closePreview}
                className="text-white hover:text-green-200 transition-colors duration-200"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 p-4 bg-gray-100">
            <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full border-none"
                title="PDF Preview"
                onError={() => setError("Failed to load PDF preview")}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              This is a preview. Download the full PDF for complete details.
            </div>
            <div className="flex space-x-2">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  if (previewResident) {
                    downloadResidentDetails(
                      previewUrl.split("/")[5],
                      previewResident.registrationNo,
                      previewResident.name
                    );
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  if (previewResident) {
                    printResidentDetails(
                      previewUrl.split("/")[5],
                      previewResident.registrationNo,
                      previewResident.name
                    );
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 min-h-screen mt-5" style={{ background: "#FEFCF2" }}>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: "#0A400C" }}
        >
          <Users className="inline-block mr-3 " size={32} />
          Residents Directory
        </h1>
        <p className="text-gray-600 text-center">
          Manage and view all registered residents
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        {/* Search Bar and Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, registration no, or location..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={handleSearchInputChange}
              onKeyPress={(e) => e.key === "Enter" && handleSearch(e)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Filter size={14} />
              Filters
              <ChevronDown
                size={14}
                className={`transform transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
            <button
              onClick={exportToExcel}
              disabled={exportLoading}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              <Download size={14} />
              {exportLoading ? "Exporting..." : "Export Excel"}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange("gender", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Health Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health Status
                </label>
                <select
                  value={filters.healthStatus}
                  onChange={(e) =>
                    handleFilterChange("healthStatus", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Critical">Critical</option>
                  <option value="Stable">Stable</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Routine">Routine</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Blood Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={filters.bloodGroup}
                  onChange={(e) =>
                    handleFilterChange("bloodGroup", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Blood Groups</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="Enter state"
                  value={filters.state}
                  onChange={(e) => handleFilterChange("state", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Age Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.ageRange.min}
                    onChange={(e) =>
                      handleFilterChange("ageRange", {
                        ...filters.ageRange,
                        min: e.target.value,
                      })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.ageRange.max}
                    onChange={(e) =>
                      handleFilterChange("ageRange", {
                        ...filters.ageRange,
                        max: e.target.value,
                      })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Admission Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.admissionDateRange.start}
                    onChange={(e) =>
                      handleFilterChange("admissionDateRange", {
                        ...filters.admissionDateRange,
                        start: e.target.value,
                      })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.admissionDateRange.end}
                    onChange={(e) =>
                      handleFilterChange("admissionDateRange", {
                        ...filters.admissionDateRange,
                        end: e.target.value,
                      })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Disability Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disability Status
                </label>
                <input
                  type="text"
                  placeholder="Enter disability status"
                  value={filters.disabilityStatus}
                  onChange={(e) =>
                    handleFilterChange("disabilityStatus", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading residents...</p>
        </div>
      )}

      {/* Residents Table */}
      {!loading && residents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("registrationNo")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Registration No</span>
                      {sortField === "registrationNo" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortField === "name" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("admissionDate")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortField === "admissionDate" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("age")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Age</span>
                      {sortField === "age" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("gender")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Gender</span>
                      {sortField === "gender" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("healthStatus")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Health Status</span>
                      {sortField === "healthStatus" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {residents.map((resident) => (
                  <tr key={resident._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {resident.registrationNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(resident)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {resident.name ||
                          resident.nameGivenByOrganization ||
                          "N/A"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resident.admissionDate
                        ? new Date(resident.admissionDate).toLocaleDateString()
                        : resident.date || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resident.age || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resident.gender || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          resident.healthStatus?.toLowerCase().includes("good")
                            ? "bg-green-100 text-green-800"
                            : resident.healthStatus
                                ?.toLowerCase()
                                .includes("critical")
                            ? "bg-red-100 text-red-800"
                            : resident.healthStatus
                                ?.toLowerCase()
                                .includes("fair")
                            ? "bg-yellow-100 text-yellow-800"
                            : resident.healthStatus
                                ?.toLowerCase()
                                .includes("stable")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {resident.healthStatus || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-8">
                        <button
                          onClick={() => handleViewDetails(resident)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleUpdateClick(resident)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                        >
                          <Edit size={16} className="mr-1" />
                          Update
                        </button>
                        <button
                          onClick={() => handleDeleteClick(resident)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          disabled={deleteLoading === resident._id}
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handlePageChange(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i + 1
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && residents.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No residents found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or add new residents.
          </p>
        </div>
      )}

      {/* Resident Details Modal */}
      {showDetails && <ResidentDetailsModal />}

      {/* Update Resident Modal */}
      {showUpdateModal && <UpdateResidentModal />}

      {/* PDF Preview Modal */}
      <PDFPreviewModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal />
    </div>
  );
};

export default ResidentsListing;

