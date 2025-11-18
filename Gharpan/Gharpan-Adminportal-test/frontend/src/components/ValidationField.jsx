import React, { useState, useEffect, useRef } from 'react';
import './ValidationField.css';

const ValidationField = ({ 
  field, 
  value, 
  onChange, 
  label, 
  type = 'text', 
  placeholder = '', 
  required = false,
  className = '',
  disabled = false,
  residentId = null,
  ...props 
}) => {
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Fields that should be validated in real-time
  const validatedFields = ['registrationNo', 'mobileNo', 'aadhaarNumber', 'age'];
  
  // Fields that should show autocomplete suggestions
  const autocompleteFields = ['guardianName', 'healthStatus', 'category'];

  useEffect(() => {
    if (validatedFields.includes(field) && value && value.trim()) {
      // Debounce validation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        validateField();
      }, 500);
    } else {
      setValidation(null);
    }

    // Fetch autocomplete suggestions
    if (autocompleteFields.includes(field) && value && value.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, field]);

  const validateField = async () => {
    if (!value || !value.trim()) return;

    try {
      setIsValidating(true);
      const response = await fetch('/api/residents/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field,
          value: value.trim(),
          context: residentId ? { residentId } : {}
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data[field]) {
        setValidation(data.data[field]);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/residents/autocomplete/${field}?q=${encodeURIComponent(value)}&limit=5`);
      const data = await response.json();
      
      if (data.success && data.data.suggestions.length > 0) {
        setSuggestions(data.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ target: { value: suggestion } });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getValidationClass = () => {
    if (!validation) return '';
    return validation.isValid ? 'is-valid' : 'is-invalid';
  };

  const getValidationIcon = () => {
    if (isValidating) return <i className="fa fa-spinner fa-spin validation-icon validating"></i>;
    if (!validation) return null;
    
    return validation.isValid 
      ? <i className="fa fa-check-circle validation-icon valid"></i>
      : <i className="fa fa-exclamation-circle validation-icon invalid"></i>;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`validation-field-container ${className}`}>
      <label className="form-label">
        {label}
        {required && <span className="required-asterisk">*</span>}
      </label>
      
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type={type}
          className={`form-control ${getValidationClass()}`}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
        
        <div className="validation-indicators">
          {getValidationIcon()}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onMouseDown={() => handleSuggestionClick(suggestion)}
              >
                <i className="fa fa-lightbulb-o suggestion-icon"></i>
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {validation && (
        <div className={`validation-feedback ${validation.isValid ? 'valid-feedback' : 'invalid-feedback'}`}>
          <div className="validation-message">
            {validation.message}
          </div>
          {validation.suggestion && !validation.isValid && (
            <div className="validation-suggestion">
              <i className="fa fa-lightbulb-o"></i>
              <span>{validation.suggestion}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationField;

