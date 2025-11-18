import React, { useState, useEffect } from "react";
import "./ToastNotification.css";

const ToastNotification = ({
  message,
  type = "info",
  duration = 4000,
  onClose,
  autoClose = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, autoClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  const getToastIcon = () => {
    switch (type) {
      case "success":
        return "fa-check-circle";
      case "error":
        return "fa-times-circle";
      case "warning":
        return "fa-exclamation-triangle";
      case "info":
      default:
        return "fa-info-circle";
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`toast-notification toast-${type} ${
        isLeaving ? "leaving" : ""
      }`}
    >
      <div className="toast-content">
        <i className={`fa ${getToastIcon()} toast-icon`}></i>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={handleClose}>
        <i className="fa fa-times"></i>
      </button>
      {autoClose && (
        <div
          className="toast-progress"
          style={{ animationDuration: `${duration}ms` }}
        ></div>
      )}
    </div>
  );
};

const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          autoClose={toast.autoClose}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration: options.duration || 4000,
      autoClose: options.autoClose !== false,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showSuccess = (message, options) =>
    addToast(message, "success", options);
  const showError = (message, options) => addToast(message, "error", options);
  const showWarning = (message, options) =>
    addToast(message, "warning", options);
  const showInfo = (message, options) => addToast(message, "info", options);

  const clearAll = () => setToasts([]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};

export { ToastNotification, ToastContainer, useToast };

