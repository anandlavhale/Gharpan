import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Modal, Form } from "react-bootstrap";
import "./Caretracking.css";

const CareTracking = () => {
  // ... (All your state and logic functions remain exactly the same) ...
  // No changes needed from line 6 to 480
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [careEvents, setCareEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showViewEventModal, setShowViewEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEvent, setEditEvent] = useState({
    date: "",
    type: "",
    description: "",
    doctor: "",
    medications: "",
    nextVisit: "",
    status: "Completed",
    remarks: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [newEvent, setNewEvent] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "",
    description: "",
    doctor: "",
    medications: "",
    nextVisit: "",
    status: "Completed",
    remarks: "",
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/residents");
      if (response.ok) {
        const result = await response.json();
        // Handle the API response structure
        const residentsData = result.success ? result.data : result;
        setResidents(residentsData || []);
        setError(null);
      } else {
        console.error("Error fetching residents:", response.statusText);
        setError("Failed to fetch residents");
      }
    } catch (error) {
      console.error("Error fetching residents:", error);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchCareEvents = async (residentId) => {
    try {
      if (!residentId) return;

      console.log("Fetching care events for resident:", residentId);
      const response = await fetch(
        `/api/residents/${residentId}/care-events`
      );
      console.log("Care events response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Care events API response:", result);

        // Handle the API response structure
        const eventsData = result.success ? result.data : result;
        console.log("Processed events data:", eventsData);
        setCareEvents(eventsData || []);
      } else {
        console.error("Error fetching care events:", response.statusText);
        setCareEvents([]);
      }
    } catch (error) {
      console.error("Error fetching care events:", error);
      setCareEvents([]);
    }
  };

  const handleResidentSelect = (resident) => {
    setSelectedResident(resident);
    fetchCareEvents(resident._id);
  };

  // Replace the existing handleAddEvent function with this updated version
  const handleAddEvent = async (e) => {
    e.preventDefault();

    console.log("=== ADD EVENT DEBUG ===");
    console.log("Form submitted with newEvent state:", newEvent);
    console.log("Status value specifically:", newEvent.status);
    console.log("Status type:", typeof newEvent.status);
    console.log("Status length:", newEvent.status?.length);

    try {
      // Validate required fields
      if (!newEvent.date || !newEvent.type || !newEvent.description) {
        setAlert({
          show: true,
          type: "danger",
          message:
            "Please fill in Date, Event Type, and Description (required fields)",
        });
        return;
      }

      // Validate description length
      if (
        newEvent.description.length < 1 ||
        newEvent.description.length > 1000
      ) {
        setAlert({
          show: true,
          type: "danger",
          message: "Description must be between 1 and 1000 characters",
        });
        return;
      }

      // Format the data with proper date handling
      const eventData = {
        type: newEvent.type.trim(),
        description: newEvent.description.trim(),
        date: newEvent.date,
        doctor: newEvent.doctor.trim() || "",
        medications: newEvent.medications.trim() || "",
        nextVisit: newEvent.nextVisit || null,
        status: newEvent.status.trim() || "Completed",
        remarks: newEvent.remarks.trim() || "",
      };

      const response = await fetch(
        `/api/residents/${selectedResident._id}/care-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Show success message
        setAlert({
          show: true,
          type: "success",
          message: "Care event added successfully!",
        });

        // Reset form
        setNewEvent({
          date: new Date().toISOString().split("T")[0],
          type: "",
          description: "",
          doctor: "",
          medications: "",
          nextVisit: "",
          status: "Completed",
          remarks: "",
        });

        // Close modal
        setShowAddEventModal(false);

        // Refresh the care events list
        fetchCareEvents(selectedResident._id);
      } else {
        throw new Error(data.message || "Failed to add event");
      }
    } catch (err) {
      console.error("Failed to add care event:", err);
      setAlert({
        show: true,
        type: "danger",
        message: `Failed to add care event: ${err.message}`,
      });
    }
  };

  // Handle view event
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowViewEventModal(true);
  };

  // Handle edit event
  const handleEditEvent = (event) => {
    console.log("Edit button clicked for event:", event);

    setEditEvent({
      date: event.date.split("T")[0], // Convert to YYYY-MM-DD format
      type: event.type,
      description: event.description,
      doctor: event.doctor || "",
      medications: event.medications || "",
      nextVisit: event.nextVisit ? event.nextVisit.split("T")[0] : "",
      status: event.status || "",
      remarks: event.remarks || "",
    });
    setSelectedEvent(event);
    setShowEditEventModal(true);
  };

  // Handle update event
  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!editEvent.date || !editEvent.type || !editEvent.description) {
        setAlert({
          show: true,
          type: "danger",
          message:
            "Please fill in Date, Event Type, and Description (required fields)",
        });
        return;
      }

      const eventData = {
        type: editEvent.type.trim(),
        description: editEvent.description.trim(),
        date: editEvent.date,
        doctor: editEvent.doctor.trim() || "",
        medications: editEvent.medications.trim() || "",
        nextVisit: editEvent.nextVisit || null,
        status: editEvent.status.trim() || "Completed",
        remarks: editEvent.remarks.trim() || "",
      };

      const response = await fetch(
        `/api/residents/${selectedResident._id}/care-events/${selectedEvent._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      const data = await response.json();

      if (data.success) {
        setAlert({
          show: true,
          type: "success",
          message: "Care event updated successfully!",
        });

        setShowEditEventModal(false);
        fetchCareEvents(selectedResident._id);
      } else {
        throw new Error(data.message || "Failed to update event");
      }
    } catch (err) {
      console.error("Failed to update care event:", err);
      setAlert({
        show: true,
        type: "danger",
        message: `Failed to update care event: ${err.message}`,
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId) => {
    console.log("Delete button clicked for event:", eventId);

    if (
      !window.confirm(
        "Are you sure you want to delete this care event? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      console.log(
        "Deleting care event:",
        eventId,
        "for resident:",
        selectedResident._id
      );

      const response = await fetch(
        `/api/residents/${selectedResident._id}/care-events/${eventId}`,
        {
          method: "DELETE",
        }
      );

      console.log("Delete response status:", response.status);
      console.log("Delete response ok:", response.ok);

      const data = await response.json();
      console.log("Delete response data:", data);

      if (data.success) {
        setAlert({
          show: true,
          type: "success",
          message: "Care event deleted successfully!",
        });

        fetchCareEvents(selectedResident._id);
      } else {
        throw new Error(data.message || "Failed to delete event");
      }
    } catch (err) {
      console.error("Failed to delete care event:", err);
      setAlert({
        show: true,
        type: "danger",
        message: `Failed to delete care event: ${err.message}`,
      });
    }
  };

  // Add this useEffect to auto-hide alerts after 5 seconds
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ show: false, message: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector(".search-bar input")?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); // Filter residents based on search and filter criteria
  const filteredResidents = residents.filter((resident) => {
    const matchesSearch =
      !searchTerm ||
      (resident.name &&
        resident.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (resident.nameGivenByOrganization &&
        resident.nameGivenByOrganization
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (resident.registrationNo &&
        resident.registrationNo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesGender = !filterGender || resident.gender === filterGender;

    const matchesAge =
      !filterAge ||
      (filterAge === "child" && resident.age < 18) ||
      (filterAge === "adult" && resident.age >= 18 && resident.age < 60) ||
      (filterAge === "senior" && resident.age >= 60);

    return matchesSearch && matchesGender && matchesAge;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterAge("");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (loading) return <div className="loading-spinner h-screen flex justify-center items-center">Loading...</div>;
  // if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="care-tracking-container mt-5">
      {/* <div className="h-screen">ww</div> */}
      <div className="header-section">
        <h1>Care Tracking Timeline</h1>
        <p>
          Monitor and manage resident care activities with clarity and
          precision.
        </p>
      </div>
      {alert.show && (
        <div
          className={`alert alert-${alert.type} alert-dismissible fade show`}
          role="alert"
        >
          {alert.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setAlert({ show: false })}
          ></button>
        </div>
      )}
      <Row className="mt-4">
        <Col md={4}>
          <Card className="residents-list-card">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Residents</h5>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="filter-toggle-btn"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Toggle Filters"
                >
                  <i className="fas fa-filter"></i>
                </Button>
              </div>
            </Card.Header>

            <div className="search-filter-section">
              <div className="search-bar">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name or ID... (Ctrl+K)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="clear-search-btn"
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  )}
                </div>
              </div>

              {showFilters && (
                <div className="filters-section">
                  <div className="filter-row">
                    <div className="filter-group">
                      <label className="filter-label">Gender</label>
                      <select
                        className="form-select form-select-sm"
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label">Age Group</label>
                      <select
                        className="form-select form-select-sm"
                        value={filterAge}
                        onChange={(e) => setFilterAge(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="child">Child (&lt;18)</option>
                        <option value="adult">Adult (18-59)</option>
                        <option value="senior">Senior (60+)</option>
                      </select>
                    </div>
                  </div>

                  <div className="filter-actions">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={clearFilters}
                      className="clear-filters-btn"
                    >
                      <i className="fas fa-undo"></i> Clear Filters
                    </Button>
                    <small className="text-muted">
                      {filteredResidents.length} / {residents.length}
                    </small>
                  </div>
                </div>
              )}
            </div>

            <Card.Body className="residents-list-body">
              {filteredResidents.length > 0 ? (
                filteredResidents.map((resident) => (
                  <div
                    key={resident._id}
                    className={`resident-item ${
                      selectedResident?._id === resident._id ? "selected" : ""
                    }`}
                    onClick={() => handleResidentSelect(resident)}
                  >
                    <div className="resident-avatar">
                      {getInitials(resident.name)}
                    </div>
                    <div className="resident-info">
                      <div className="resident-name">{resident.name}</div>
                      <div className="resident-details">
                        ID: {resident.registrationNo}
                        {resident.age && <span> • Age: {resident.age}</span>}
                        {resident.gender && <span> • {resident.gender}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data-prompt">
                  <i className="fas fa-user-slash fa-2x text-muted mb-3"></i>
                  <p className="mb-0">No residents found.</p>
                  <small className="text-muted">
                    Try adjusting your search or filters.
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          {selectedResident ? (
            <div className="timeline-section">
              <div className="timeline-header">
                <h3>{selectedResident.name}'s Care Timeline</h3>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowAddEventModal(true);
                  }}
                >
                  <i className="fas fa-plus me-2"></i> Add Care Event
                </Button>
              </div>

              <div className="timeline">
                {careEvents && careEvents.length > 0 ? (
                  careEvents
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((event) => (
                      <div key={event._id} className="timeline-item">
                        <div className="timeline-point"></div>
                        <Card className="timeline-content">
                          <Card.Header>
                            <div className="event-meta">
                              <div className="event-date">
                                {new Date(event.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </div>
                              <div className="event-type">
                                {event.type.replace(/_/g, " ")}
                              </div>
                            </div>
                            <div className="event-actions">
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleViewEvent(event)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleEditEvent(event)}
                                title="Edit Event"
                              >
                                <i className="fas fa-pencil-alt"></i>
                              </Button>
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleDeleteEvent(event._id)}
                                title="Delete Event"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </Button>
                            </div>
                          </Card.Header>
                          <Card.Body>
                            <p className="event-description">
                              {event.description}
                            </p>
                            <div className="event-details-grid">
                              {event.doctor && (
                                <p>
                                  <strong>
                                    <i className="fas fa-user-md me-2 text-muted"></i>
                                    Doctor:
                                  </strong>{" "}
                                  {event.doctor}
                                </p>
                              )}
                              {event.medications && (
                                <p>
                                  <strong>
                                    <i className="fas fa-pills me-2 text-muted"></i>
                                    Medications:
                                  </strong>{" "}
                                  {event.medications}
                                </p>
                              )}
                              {event.nextVisit && (
                                <p>
                                  <strong>
                                    <i className="fas fa-calendar-check me-2 text-muted"></i>
                                    Next Visit:
                                  </strong>{" "}
                                  {new Date(
                                    event.nextVisit
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-3">
                              <div
                                className={`status-badge status-${event.status
                                  ?.toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {event.status}
                              </div>
                              <small className="text-muted fst-italic">
                                Added on:{" "}
                                {new Date(event.createdAt).toLocaleString()}
                              </small>
                            </div>
                          </Card.Body>
                        </Card>
                      </div>
                    ))
                ) : (
                  <div className="no-data-prompt">
                    <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <p>No care events found for this resident.</p>
                    <p className="text-muted">
                      Click "Add Care Event" to create the first entry.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="select-resident-prompt">
              <i className="fas fa-mouse-pointer fa-3x mb-3"></i>
              <h3>Select a resident to view their care timeline</h3>
              <p className="text-muted">
                Choose a resident from the list on the left to see their
                details.
              </p>
            </div>
          )}
        </Col>
      </Row>
      {/* ... (All your Modals JSX can remain the same) ... */}
      {/* Add Event Modal */}
      <Modal
        show={showAddEventModal}
        onHide={() => setShowAddEventModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-calendar-plus me-2"></i>Add Care Event
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddEvent}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={newEvent.date}
                    max="2030-12-31"
                    min="2020-01-01"
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, date: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Event Type <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="e.g., Doctor Visit, Therapy"
                    value={newEvent.type}
                    maxLength="200"
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, type: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>
                Description <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                placeholder="Describe the care event, treatments provided, observations, etc."
                value={newEvent.description}
                maxLength="1000"
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
              />
              <Form.Text className="text-muted d-block text-end">
                {newEvent.description.length}/1000
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Doctor/Healthcare Provider</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Dr. Smith"
                    value={newEvent.doctor}
                    maxLength="200"
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, doctor: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Next Visit Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={newEvent.nextVisit}
                    min={new Date().toISOString().split("T")[0]}
                    max="2030-12-31"
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, nextVisit: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Medications/Treatments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="e.g., Paracetamol 500mg, Physiotherapy session"
                value={newEvent.medications}
                maxLength="500"
                onChange={(e) =>
                  setNewEvent({ ...newEvent, medications: e.target.value })
                }
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={newEvent.status}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, status: e.target.value });
                    }}
                    required
                  >
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Remarks / Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newEvent.remarks}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, remarks: e.target.value })
                }
                placeholder="Additional notes, observations, or remarks..."
                maxLength="500"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={() => setShowAddEventModal(false)}
                className="me-2"
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <i className="fas fa-check me-2"></i>Add Event
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      {/* View Event Modal */}
      <Modal
        show={showViewEventModal}
        onHide={() => setShowViewEventModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-file-alt me-2"></i>Care Event Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div className="care-event-details">
              <Row className="mb-3">
                <Col>
                  <strong>Type:</strong>{" "}
                  <span className="event-type-modal">{selectedEvent.type}</span>
                </Col>
                <Col>
                  <strong>Date:</strong>{" "}
                  {new Date(selectedEvent.date).toLocaleDateString()}
                </Col>
                <Col>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`status-badge status-${selectedEvent.status
                      ?.toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {selectedEvent.status}
                  </span>
                </Col>
              </Row>
              <div className="detail-section">
                <h6>
                  <i className="fas fa-info-circle me-2"></i>Description
                </h6>
                <p>{selectedEvent.description}</p>
              </div>
              <Row>
                <Col md={6}>
                  <div className="detail-section">
                    <h6>
                      <i className="fas fa-user-md me-2"></i>Doctor/Provider
                    </h6>
                    <p>{selectedEvent.doctor || "N/A"}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-section">
                    <h6>
                      <i className="fas fa-calendar-check me-2"></i>Next Visit
                    </h6>
                    <p>
                      {selectedEvent.nextVisit
                        ? new Date(selectedEvent.nextVisit).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </Col>
              </Row>
              <div className="detail-section">
                <h6>
                  <i className="fas fa-pills me-2"></i>Medications/Treatments
                </h6>
                <p>{selectedEvent.medications || "N/A"}</p>
              </div>
              {selectedEvent.remarks && (
                <div className="detail-section remarks">
                  <h6>
                    <i className="fas fa-sticky-note me-2"></i>Remarks
                  </h6>
                  <p>{selectedEvent.remarks}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <small className="text-muted">
            Created on{" "}
            {selectedEvent &&
              new Date(selectedEvent.createdAt).toLocaleString()}
          </small>
          <div>
            <Button
              variant="secondary"
              onClick={() => setShowViewEventModal(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              className="ms-2"
              onClick={() => {
                setShowViewEventModal(false);
                handleEditEvent(selectedEvent);
              }}
            >
              <i className="fas fa-pencil-alt me-2"></i>Edit Event
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      {/* Edit Event Modal (Structure remains same, but will adopt new CSS) */}
      <Modal
        show={showEditEventModal}
        onHide={() => setShowEditEventModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>Edit Care Event
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateEvent}>
            {/* Form content is identical to Add Modal, just uses editEvent state */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Date <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={editEvent.date}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, date: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Event Type <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={editEvent.type}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, type: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>
                Description <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={editEvent.description}
                onChange={(e) =>
                  setEditEvent({ ...editEvent, description: e.target.value })
                }
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Doctor/Healthcare Provider</Form.Label>
                  <Form.Control
                    type="text"
                    value={editEvent.doctor}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, doctor: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Next Visit Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={editEvent.nextVisit}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, nextVisit: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Medications/Treatments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={editEvent.medications}
                onChange={(e) =>
                  setEditEvent({ ...editEvent, medications: e.target.value })
                }
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    value={editEvent.status}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, status: e.target.value })
                    }
                    required
                  >
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Pending">Pending</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Remarks / Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={editEvent.remarks}
                onChange={(e) =>
                  setEditEvent({ ...editEvent, remarks: e.target.value })
                }
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={() => setShowEditEventModal(false)}
                className="me-2"
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <i className="fas fa-save me-2"></i>Update Event
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CareTracking;

