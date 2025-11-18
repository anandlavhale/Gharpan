// Validation utility for forms - NO REQUIRED FIELDS, only format validation
export const registrationFormRules = {
  // No required rules - all fields are optional
  // Only format validation for better UX
  
  mobileNo: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Mobile number should be 10 digits starting with 6-9'
  },
  
  age: {
    pattern: /^\d+$/,
    min: 0,
    max: 150,
    message: 'Age should be a valid number between 0-150'
  },
  
  weight: {
    pattern: /^\d*\.?\d+$/,
    message: 'Weight should be a valid number (e.g., 65.5)'
  },
  
  height: {
    pattern: /^\d*\.?\d+$/,
    message: 'Height should be a valid number (e.g., 170.5)'
  },
  
  voterId: {
    pattern: /^[A-Z]{3}[0-9]{7}$/,
    message: 'Voter ID should be in format: ABC1234567'
  },
  
  aadhaarNumber: {
    pattern: /^\d{12}$/,
    message: 'Aadhaar should be 12 digits'
  }
};

// Validate individual field - only format, no required validation
export const validateField = (name, value, rules = registrationFormRules) => {
  if (!value || !rules[name]) {
    return { isValid: true, error: '' };
  }

  const rule = rules[name];
  
  // Pattern validation
  if (rule.pattern && !rule.pattern.test(value)) {
    return { isValid: false, error: rule.message };
  }
  
  // Min/Max validation for numbers
  if (rule.min !== undefined && parseFloat(value) < rule.min) {
    return { isValid: false, error: rule.message };
  }
  
  if (rule.max !== undefined && parseFloat(value) > rule.max) {
    return { isValid: false, error: rule.message };
  }
  
  return { isValid: true, error: '' };
};

// Validate entire form - returns warnings, not errors since nothing is required
export const validateForm = (data, rules = registrationFormRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(data).forEach(key => {
    const validation = validateField(key, data[key], rules);
    if (!validation.isValid) {
      errors[key] = validation.error;
      isValid = false;
    }
  });
  
  return { isValid, errors };
};

// Auto-save utility
export const saveFormDraft = (formData) => {
  try {
    const timestamp = new Date().toISOString();
    const draftData = {
      ...formData,
      lastSaved: timestamp,
      isDraft: true
    };
    localStorage.setItem('registrationFormDraft', JSON.stringify(draftData));
    return { success: true, timestamp };
  } catch (error) {
    console.error('Failed to save draft:', error);
    return { success: false, error };
  }
};

// Load draft utility
export const loadFormDraft = () => {
  try {
    const draft = localStorage.getItem('registrationFormDraft');
    if (draft) {
      return JSON.parse(draft);
    }
    return null;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
};

// Clear draft utility
export const clearFormDraft = () => {
  try {
    localStorage.removeItem('registrationFormDraft');
    return true;
  } catch (error) {
    console.error('Failed to clear draft:', error);
    return false;
  }
};

