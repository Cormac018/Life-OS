/* =========================
   ui-helpers.js — UI State Management Utilities
   - Loading states for buttons and forms
   - Button enable/disable helpers
   - Form validation helpers
   ========================= */

(function (global) {
  /**
   * Set button loading state
   * @param {HTMLButtonElement|string} buttonOrId - Button element or ID
   * @param {boolean} isLoading - Whether button should be in loading state
   */
  function setButtonLoading(buttonOrId, isLoading) {
    const btn = typeof buttonOrId === 'string'
      ? document.getElementById(buttonOrId)
      : buttonOrId;

    if (!btn) return;

    if (isLoading) {
      btn.classList.add('loading');
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
      if (btn.dataset.originalText) {
        btn.textContent = btn.dataset.originalText;
        delete btn.dataset.originalText;
      }
    }
  }

  /**
   * Set form loading state
   * @param {HTMLFormElement|string} formOrId - Form element or ID
   * @param {boolean} isLoading - Whether form should be in loading state
   */
  function setFormLoading(formOrId, isLoading) {
    const form = typeof formOrId === 'string'
      ? document.getElementById(formOrId)
      : formOrId;

    if (!form) return;

    if (isLoading) {
      form.classList.add('loading');
      // Disable all inputs and buttons in the form
      const inputs = form.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => {
        input.disabled = true;
        input.dataset.wasDisabled = input.disabled;
      });
    } else {
      form.classList.remove('loading');
      // Re-enable inputs that weren't originally disabled
      const inputs = form.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => {
        if (input.dataset.wasDisabled !== 'true') {
          input.disabled = false;
        }
        delete input.dataset.wasDisabled;
      });
    }
  }

  /**
   * Set card loading state
   * @param {HTMLElement|string} cardOrId - Card element or ID
   * @param {boolean} isLoading - Whether card should be in loading state
   */
  function setCardLoading(cardOrId, isLoading) {
    const card = typeof cardOrId === 'string'
      ? document.getElementById(cardOrId)
      : cardOrId;

    if (!card) return;

    if (isLoading) {
      card.classList.add('loading');
    } else {
      card.classList.remove('loading');
    }
  }

  /**
   * Execute async function with button loading state
   * @param {HTMLButtonElement|string} buttonOrId - Button element or ID
   * @param {Function} asyncFn - Async function to execute
   * @returns {Promise} - Result of async function
   */
  async function withButtonLoading(buttonOrId, asyncFn) {
    setButtonLoading(buttonOrId, true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setButtonLoading(buttonOrId, false);
    }
  }

  /**
   * Execute async function with form loading state
   * @param {HTMLFormElement|string} formOrId - Form element or ID
   * @param {Function} asyncFn - Async function to execute
   * @returns {Promise} - Result of async function
   */
  async function withFormLoading(formOrId, asyncFn) {
    setFormLoading(formOrId, true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setFormLoading(formOrId, false);
    }
  }

  /**
   * Disable button with optional custom disabled text
   * @param {HTMLButtonElement|string} buttonOrId - Button element or ID
   * @param {boolean} isDisabled - Whether to disable the button
   * @param {string} disabledText - Optional text to show when disabled
   */
  function setButtonDisabled(buttonOrId, isDisabled, disabledText) {
    const btn = typeof buttonOrId === 'string'
      ? document.getElementById(buttonOrId)
      : buttonOrId;

    if (!btn) return;

    if (isDisabled) {
      btn.disabled = true;
      btn.classList.add('disabled');
      if (disabledText) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = disabledText;
      }
    } else {
      btn.disabled = false;
      btn.classList.remove('disabled');
      if (btn.dataset.originalText) {
        btn.textContent = btn.dataset.originalText;
        delete btn.dataset.originalText;
      }
    }
  }

  /**
   * Create skeleton loading placeholder
   * @param {string} type - Type of skeleton (text, title, card)
   * @returns {HTMLElement} - Skeleton element
   */
  function createSkeleton(type = 'text') {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;
    return skeleton;
  }

  /**
   * Replace element content with skeleton loaders
   * @param {HTMLElement|string} elementOrId - Element or ID
   * @param {number} count - Number of skeleton items
   * @param {string} type - Type of skeleton
   */
  function showSkeletonLoading(elementOrId, count = 3, type = 'text') {
    const element = typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

    if (!element) return;

    element.dataset.originalContent = element.innerHTML;
    element.innerHTML = '';

    for (let i = 0; i < count; i++) {
      element.appendChild(createSkeleton(type));
    }
  }

  /**
   * Restore original content after skeleton loading
   * @param {HTMLElement|string} elementOrId - Element or ID
   */
  function hideSkeletonLoading(elementOrId) {
    const element = typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

    if (!element) return;

    if (element.dataset.originalContent !== undefined) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
  }

  /* =========================
     FORM VALIDATION HELPERS
     ========================= */

  /**
   * Show validation message for an input
   * @param {HTMLInputElement|string} inputOrId - Input element or ID
   * @param {string} message - Validation message
   * @param {string} type - Type: 'error', 'success', 'warning', 'info'
   */
  function showValidationMessage(inputOrId, message, type = 'error') {
    const input = typeof inputOrId === 'string'
      ? document.getElementById(inputOrId)
      : inputOrId;

    if (!input) return;

    // Remove existing message
    hideValidationMessage(input);

    // Add validation class to input
    input.classList.remove('valid', 'invalid');
    if (type === 'error') {
      input.classList.add('invalid');
    } else if (type === 'success') {
      input.classList.add('valid');
    }

    // Create message element
    const msgEl = document.createElement('div');
    msgEl.className = `validation-message ${type}`;
    msgEl.textContent = message;
    msgEl.dataset.validationFor = input.id || input.name;

    // Insert after input
    if (input.nextSibling) {
      input.parentNode.insertBefore(msgEl, input.nextSibling);
    } else {
      input.parentNode.appendChild(msgEl);
    }
  }

  /**
   * Hide validation message for an input
   * @param {HTMLInputElement|string} inputOrId - Input element or ID
   */
  function hideValidationMessage(inputOrId) {
    const input = typeof inputOrId === 'string'
      ? document.getElementById(inputOrId)
      : inputOrId;

    if (!input) return;

    // Remove validation classes
    input.classList.remove('valid', 'invalid');

    // Find and remove message
    const parent = input.parentNode;
    const existingMsg = parent.querySelector('.validation-message');
    if (existingMsg) {
      existingMsg.remove();
    }
  }

  /**
   * Validate input based on rules
   * @param {HTMLInputElement|string} inputOrId - Input element or ID
   * @param {Object} rules - Validation rules
   * @returns {Object} - {valid: boolean, message: string}
   */
  function validateInput(inputOrId, rules = {}) {
    const input = typeof inputOrId === 'string'
      ? document.getElementById(inputOrId)
      : inputOrId;

    if (!input) return { valid: false, message: 'Input not found' };

    const value = input.value.trim();

    // Required check
    if (rules.required && !value) {
      return { valid: false, message: rules.requiredMessage || 'This field is required' };
    }

    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      return { valid: false, message: `Minimum ${rules.minLength} characters required` };
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, message: `Maximum ${rules.maxLength} characters allowed` };
    }

    // Min value
    if (rules.min !== undefined && Number(value) < rules.min) {
      return { valid: false, message: `Value must be at least ${rules.min}` };
    }

    // Max value
    if (rules.max !== undefined && Number(value) > rules.max) {
      return { valid: false, message: `Value must be at most ${rules.max}` };
    }

    // Pattern (regex)
    if (rules.pattern && !rules.pattern.test(value)) {
      return { valid: false, message: rules.patternMessage || 'Invalid format' };
    }

    // Email validation
    if (rules.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return { valid: false, message: 'Invalid email address' };
      }
    }

    // Custom validator function
    if (rules.custom && typeof rules.custom === 'function') {
      const result = rules.custom(value, input);
      if (result !== true) {
        return { valid: false, message: result || 'Validation failed' };
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate and show inline feedback
   * @param {HTMLInputElement|string} inputOrId - Input element or ID
   * @param {Object} rules - Validation rules
   * @returns {boolean} - Whether input is valid
   */
  function validateAndShowFeedback(inputOrId, rules = {}) {
    const result = validateInput(inputOrId, rules);

    if (result.valid) {
      hideValidationMessage(inputOrId);
      if (rules.showSuccess) {
        showValidationMessage(inputOrId, rules.successMessage || '✓', 'success');
      }
    } else {
      showValidationMessage(inputOrId, result.message, 'error');
    }

    return result.valid;
  }

  /**
   * Validate entire form
   * @param {HTMLFormElement|string} formOrId - Form element or ID
   * @param {Object} fieldRules - Map of field names to validation rules
   * @returns {Object} - {valid: boolean, errors: Array}
   */
  function validateForm(formOrId, fieldRules = {}) {
    const form = typeof formOrId === 'string'
      ? document.getElementById(formOrId)
      : formOrId;

    if (!form) return { valid: false, errors: ['Form not found'] };

    const errors = [];

    // Validate each field
    Object.keys(fieldRules).forEach(fieldName => {
      const input = form.elements[fieldName];
      if (!input) return;

      const result = validateInput(input, fieldRules[fieldName]);
      if (!result.valid) {
        errors.push({ field: fieldName, message: result.message });
        showValidationMessage(input, result.message, 'error');
      } else {
        hideValidationMessage(input);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Show form error summary
   * @param {HTMLFormElement|string} formOrId - Form element or ID
   * @param {Array} errors - Array of error objects {field, message}
   */
  function showFormErrors(formOrId, errors) {
    const form = typeof formOrId === 'string'
      ? document.getElementById(formOrId)
      : formOrId;

    if (!form || !errors || errors.length === 0) return;

    // Remove existing error summary
    const existingSummary = form.querySelector('.form-errors');
    if (existingSummary) existingSummary.remove();

    // Create error summary
    const summary = document.createElement('div');
    summary.className = 'form-errors';
    summary.innerHTML = `
      <div class="form-errors-title">Please fix the following errors:</div>
      <ul class="form-errors-list">
        ${errors.map(err => `<li>${err.message}</li>`).join('')}
      </ul>
    `;

    // Insert at the beginning of the form
    form.insertBefore(summary, form.firstChild);
  }

  /**
   * Add real-time validation to input
   * @param {HTMLInputElement|string} inputOrId - Input element or ID
   * @param {Object} rules - Validation rules
   */
  function addRealTimeValidation(inputOrId, rules = {}) {
    const input = typeof inputOrId === 'string'
      ? document.getElementById(inputOrId)
      : inputOrId;

    if (!input) return;

    // Validate on blur
    input.addEventListener('blur', () => {
      validateAndShowFeedback(input, rules);
    });

    // Clear validation on focus
    input.addEventListener('focus', () => {
      hideValidationMessage(input);
    });

    // Real-time validation on input (with debounce)
    if (rules.realTime) {
      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          validateAndShowFeedback(input, rules);
        }, 500);
      });
    }
  }

  /* =========================
     EMPTY STATE HELPERS
     ========================= */

  /**
   * Create empty state element
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} - Empty state element
   */
  function createEmptyState(options = {}) {
    const {
      icon = '📭',
      title = 'Nothing here yet',
      description = 'Get started by adding your first item',
      actionText = null,
      actionCallback = null,
      compact = false
    } = options;

    const container = document.createElement('div');
    container.className = compact ? 'empty-state empty-state-compact' : 'empty-state';

    let html = `
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-description">${description}</div>
    `;

    if (actionText && actionCallback) {
      const btnId = `empty-state-action-${Date.now()}`;
      html += `
        <div class="empty-state-action">
          <button id="${btnId}">${actionText}</button>
        </div>
      `;
      container.innerHTML = html;

      // Wire up action
      const btn = container.querySelector(`#${btnId}`);
      if (btn) {
        btn.addEventListener('click', actionCallback);
      }
    } else {
      container.innerHTML = html;
    }

    return container;
  }

  /**
   * Show empty state in container
   * @param {HTMLElement|string} containerOrId - Container element or ID
   * @param {Object} options - Empty state options
   */
  function showEmptyState(containerOrId, options = {}) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;

    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Add empty state
    const emptyState = createEmptyState(options);
    container.appendChild(emptyState);
  }

  /**
   * Hide empty state (clear container)
   * @param {HTMLElement|string} containerOrId - Container element or ID
   */
  function hideEmptyState(containerOrId) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;

    if (!container) return;

    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }

  // Export utilities to global scope
  global.UIHelpers = {
    // Loading states
    setButtonLoading,
    setFormLoading,
    setCardLoading,
    withButtonLoading,
    withFormLoading,
    setButtonDisabled,
    createSkeleton,
    showSkeletonLoading,
    hideSkeletonLoading,
    // Validation
    showValidationMessage,
    hideValidationMessage,
    validateInput,
    validateAndShowFeedback,
    validateForm,
    showFormErrors,
    addRealTimeValidation,
    // Empty states
    createEmptyState,
    showEmptyState,
    hideEmptyState
  };
})(window);
