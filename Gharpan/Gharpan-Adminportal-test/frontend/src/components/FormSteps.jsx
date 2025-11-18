import React from 'react';

const FormSteps = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="mb-4">
      {/* Simple Step Tracker */}
      <div className="row">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const canNavigate = stepNumber <= currentStep;
          
          return (
            <div key={step.id} className="col">
              <div className="text-center">
                <button
                  onClick={() => canNavigate && onStepClick(stepNumber)}
                  disabled={!canNavigate}
                  className={`btn btn-sm mb-2 ${
                    isActive 
                      ? 'btn-primary' 
                      : isCompleted 
                        ? 'btn-success' 
                        : 'btn-outline-secondary'
                  }`}
                  style={{ width: '35px', height: '35px', borderRadius: '50%' }}
                >
                  {isCompleted ? '✓' : stepNumber}
                </button>
                <div className={`small ${isActive ? 'fw-bold text-primary' : 'text-muted'}`}>
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Simple Progress Bar */}
      <div className="progress mt-3" style={{ height: '4px' }}>
        <div 
          className="progress-bar" 
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default FormSteps;

