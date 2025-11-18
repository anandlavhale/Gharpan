import React from 'react';

const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  placeholder, 
  options = [], 
  helper,
  disabled = false,
  className = '',
  autoComplete = 'off',
  maxLength,
  min,
  max,
  accept
}) => {
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select 
            name={name} 
            value={value} 
            onChange={onChange}
            className={`form-control ${error ? 'is-invalid' : ''}`}
            disabled={disabled}
          >
            <option value="">-- Please select --</option>
            {options.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea 
            name={name} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder}
            className={`form-control ${error ? 'is-invalid' : ''}`}
            disabled={disabled}
            rows={4}
          />
        );
      
      case 'file':
        return (
          <input 
            type="file" 
            name={name} 
            onChange={onChange}
            className={`form-control ${error ? 'is-invalid' : ''}`}
            disabled={disabled}
            accept={accept}
          />
        );
      
      default:
        return (
          <input 
            type={type} 
            name={name} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder}
            className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            min={min}
            max={max}
          />
        );
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor={name} className="form-label">
        {label}
        <small className="text-success ms-2">(Optional)</small>
      </label>
      
      {renderInput()}
      
      {helper && (
        <small className="form-text text-muted">{helper}</small>
      )}
      
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;

