import React, { forwardRef } from 'react';

/**
 * Shared Input/Form Components
 * Used across all portals (Student, Employer, Admin)
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, containerClassName = '', className = '', ...props }, ref) => {
    const hasError = !!error;

    const baseInputClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      placeholder-gray-400
      focus:outline-none focus:ring-1
      sm:text-sm
    `;

    const inputStateClasses = hasError
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    const iconPaddingClasses = leftIcon ? 'pl-10' : '';
    const rightIconPaddingClasses = rightIcon ? 'pr-10' : '';

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            className={`${baseInputClasses} ${inputStateClasses} ${iconPaddingClasses} ${rightIconPaddingClasses} ${className}`}
            aria-invalid={hasError}
            aria-describedby={error ? 'error-message' : helperText ? 'helper-text' : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-500">{rightIcon}</span>
            </div>
          )}
        </div>

        {error && (
          <p id="error-message" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id="helper-text" className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, containerClassName = '', className = '', ...props }, ref) => {
    const hasError = !!error;

    const baseSelectClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      focus:outline-none focus:ring-1
      sm:text-sm
    `;

    const selectStateClasses = hasError
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          className={`${baseSelectClasses} ${selectStateClasses} ${className}`}
          aria-invalid={hasError}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, containerClassName = '', className = '', ...props }, ref) => {
    const hasError = !!error;

    const baseTextareaClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      placeholder-gray-400
      focus:outline-none focus:ring-1
      sm:text-sm
    `;

    const textareaStateClasses = hasError
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={`${baseTextareaClasses} ${textareaStateClasses} ${className}`}
          aria-invalid={hasError}
          rows={4}
          {...props}
        />

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Checkbox Component
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div className={containerClassName}>
      <label className="flex items-center">
        <input
          type="checkbox"
          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
          {...props}
        />
        <span className="ml-2 text-sm text-gray-700">{label}</span>
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;