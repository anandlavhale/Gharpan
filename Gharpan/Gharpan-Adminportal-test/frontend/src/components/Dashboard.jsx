import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Card, Row, Col } from "react-bootstrap";
import CountUp from "react-countup";
import logo from "../images/image1.jpg";
import { Link } from "react-router-dom";

const dashboardFont = {
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    totalResidents: 0,
    successfulRehabilitations: 0,
    ongoingCarePrograms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch statistics from the backend
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch total residents
      const residentsResponse = await fetch(
        "/api/residents"
      );
      const residentsData = await residentsResponse.json();

      if (residentsData.success) {
        const totalResidents = residentsData.data
          ? residentsData.data.length
          : 0;

        // Debug: Log rehabStatus values
        console.log(
          "Resident rehabStatus values:",
          residentsData.data?.map((r) => ({
            name: r.name,
            rehabStatus: r.rehabStatus,
          }))
        );

        // Calculate successful rehabilitations based on rehabStatus field (case-insensitive)
        const successfulRehabs = residentsData.data
          ? residentsData.data.filter((resident) => {
              const status = (resident.rehabStatus || "").toLowerCase();
              return (
                status === "completed" ||
                status === "successful" ||
                status === "discharged" ||
                status === "graduated" ||
                status === "released" ||
                status === "rehabilitated"
              );
            }).length
          : 0;

        // Calculate ongoing care programs based on rehabStatus field
        // If rehabStatus is null/empty, consider them as ongoing (newly admitted)
        const ongoingCare = residentsData.data
          ? residentsData.data.filter((resident) => {
              const status = (resident.rehabStatus || "").toLowerCase();
              return (
                status === "in progress" ||
                status === "active" ||
                status === "ongoing" ||
                status === "under treatment" ||
                status === "admitted" ||
                !resident.rehabStatus || // No status means still ongoing/newly admitted
                resident.rehabStatus === "" ||
                status === "null"
              );
            }).length
          : 0;

        console.log("Statistics calculated:", {
          totalResidents,
          successfulRehabs,
          ongoingCare,
        });

        setStatistics({
          totalResidents,
          successfulRehabilitations: successfulRehabs,
          ongoingCarePrograms: ongoingCare,
        });
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      setError("Failed to load statistics from server");
      // Keep default values if API fails
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchStatistics();
  }, []);

  const cards = [
    {
      title: "Total Residents",
      count: statistics.totalResidents,
      iconClass: "fa fa-users",
    },
    {
      title: "Successful Rehabilitations",
      count: statistics.successfulRehabilitations,
      iconClass: "fa fa-handshake",
    },
    {
      title: "Ongoing Care Programs",
      count: statistics.ongoingCarePrograms,
      iconClass: "fa fa-heartbeat",
    },
  ];

  const quickModules = [
    {
      title: "Resident Registration",
      iconClass: "fa fa-user-plus",
      link: "/register",
    },
    { title: "Listing", iconClass: "fa fa-list", link: "/listings" },
    {
      title: "Care Tracking Timeline",
      iconClass: "fa fa-heartbeat",
      link: "/care-tracking",
    },
  ];
  {
    error && <div className="alert alert-danger">{error}</div>;
  }
  return (
    <>
      <div style={{ background: "#FEFCF2" }}>
        <div className="container my-5 mt-5 pt-5" style={dashboardFont}>
          <div
            className="p-5 text-center rounded-4 shadow-lg dashboard-header"
            style={{
              ...dashboardFont,
              letterSpacing: "0.5px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <h1
                style={{
                  fontWeight: 700,
                  fontSize: "2.5rem",
                  marginBottom: 0,
                  marginTop: 0,
                  lineHeight: 1,
                }}
              >
                Gharpan Dashboard
              </h1>
              <p
                className="lead"
                style={{ fontSize: "1.2rem", fontWeight: 400, marginTop: 3 }}
              >
                Overview of all rehabilitation activities and records.
              </p>
              <img
                src={logo}
                alt="logo"
                className="dashboard-logo"
                style={{
                  borderRadius: "1rem",
                  width: 220,
                  height: 220,
                }}
              />
            </div>
          </div>
        </div>

        <div className="container mt-4" style={dashboardFont}>
          <Row>
            {cards.map((item, index) => (
              <Col key={index} md={4} className="mb-4">
                <Card
                  className="shadow-lg text-center dashboard-card dashboard-hover"
                  style={{
                    borderRadius: "1rem",
                    border: "2px solid #e5e7eb",
                    minHeight: 160,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    marginBottom: "1rem",
                    borderTop: "5px solid #0A400C",
                  }}
                >
                  <Card.Body
                    style={{
                      padding: "1rem 1rem",
                    }}
                  >
                    <i
                      className={`${item.iconClass} fa-2x mb-3`}
                      style={{ color: "#0A400C" }}
                    ></i>
                    <Card.Title
                      className="dashboard-title"
                      style={{
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        marginBottom: 8,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {item.title}
                    </Card.Title>
                    <Card.Text
                      className="dashboard-count"
                      style={{ fontSize: "1.8rem", fontWeight: 800 }}
                    >
                      {loading ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                      ) : (
                        <CountUp end={item.count} duration={2.5} />
                      )}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <div class="mt-5 mb-5">
          <div class="p-5 text-center bg-body-tertiary">
            <div class="container ">
              <h4 className="text-center mb-4" style={{ color: "#0A400C" }}>
                Management Modules
              </h4>
              <Row>
                {quickModules.map((item, index) => (
                  <Col key={index} md={4} className="mb-4">
                    {item.link ? (
                      <Link to={item.link} style={{ textDecoration: "none" }}>
                        <Card
                          className="shadow-lg text-center card-bor quick-card dashboard-hover"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                            borderRadius: "1rem",
                            border: "2px solid #e5e7eb",
                            minHeight: 120,
                            fontFamily: "inherit",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            cursor: "pointer",
                            marginBottom: "1rem",
                          }}
                        >
                          <Card.Body style={{ padding: "1.5rem 1rem" }}>
                            <i
                              className={`${item.iconClass} fa-2x mb-3`}
                              style={{ color: "#0A400C" }}
                            ></i>
                            <Card.Title
                              className="dashboard-title"
                              style={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                marginBottom: 8,
                                letterSpacing: "0.5px",
                              }}
                            >
                              {item.title}
                            </Card.Title>
                          </Card.Body>
                        </Card>
                      </Link>
                    ) : (
                      <Card
                        className="shadow-lg text-center card-bor quick-card dashboard-hover"
                        style={{
                          animationDelay: `${index * 0.1}s`,
                          borderRadius: "1rem",
                          border: "2px solid #e5e7eb",
                          minHeight: 120,
                          fontFamily: "inherit",
                          transition: "transform 0.2s, box-shadow 0.2s",
                          cursor: "pointer",
                          marginBottom: "1rem",
                        }}
                      >
                        <Card.Body style={{ padding: "1.5rem 1rem" }}>
                          <i
                            className={`${item.iconClass} fa-2x mb-3`}
                            style={{ color: "#0A400C" }}
                          ></i>
                          <Card.Title
                            className="dashboard-title"
                            style={{
                              fontWeight: 700,
                              fontSize: "1rem",
                              marginBottom: 8,
                              letterSpacing: "0.5px",
                            }}
                          >
                            {item.title}
                          </Card.Title>
                        </Card.Body>
                      </Card>
                    )}
                  </Col>
                ))}
              </Row>
            </div>{" "}
          </div>{" "}
        </div>
      </div>
    </>
  );
};

export default Dashboard;

