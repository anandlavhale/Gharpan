import React, { useState, useEffect } from 'react';
import './NotificationSystem.css';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/residents/notifications');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'notification-high';
      case 'medium':
        return 'notification-medium';
      default:
        return 'notification-low';
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (loading) {
    return (
      <div className="notification-system loading">
        <div className="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notification-system">
      <div className="notification-header">
        <h3>
          <span className="notification-icon">🔔</span>
          System Notifications
          {notifications.length > 0 && (
            <span className="notification-count">{notifications.length}</span>
          )}
        </h3>
        <button 
          className="refresh-btn" 
          onClick={fetchNotifications}
          title="Refresh notifications"
        >
          🔄
        </button>
      </div>

      <div className="notifications-container">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <span className="emoji">🎉</span>
            <p>All clear! No notifications at this time.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${getPriorityClass(notification.priority)}`}
            >
              <div className="notification-content">
                <div className="notification-title">
                  <span className="notification-type-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                className="dismiss-btn"
                onClick={() => dismissNotification(notification.id)}
                title="Dismiss notification"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-actions">
          <button
            className="clear-all-btn"
            onClick={() => setNotifications([])}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;

