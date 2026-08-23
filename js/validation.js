/**
 * FlowLock Form Validation Module
 */

import { detectCycle } from './dependencyEngine.js';

// Validate task form fields and dependency selection before submit
export const validateTaskForm = (formData, currentTaskId = null, existingTasks = []) => {
  const errors = {};

  // Title validation
  if (!formData.title || formData.title.trim() === '') {
    errors.title = 'Task title is required.';
  } else if (formData.title.trim().length < 3) {
    errors.title = 'Task title must be at least 3 characters.';
  }

  // Duplicate title validation
if (formData.title && formData.title.trim() !== '') {
    const normalizedTitle = formData.title.trim().toLowerCase();

    const duplicateTask = existingTasks.find(task => {
        const sameTitle =
            task.title &&
            task.title.trim().toLowerCase() === normalizedTitle;

        const isDifferentTask =
            !currentTaskId || task.id !== currentTaskId;

        return sameTitle && isDifferentTask;
    });

    if (duplicateTask) {
        errors.title = 'A task with this title already exists.';
    }
}

  // Description validation
  if (!formData.description || formData.description.trim() === '') {
    errors.description = 'Description is required.';
  }

  // Due date validation
if (formData.dueDate) {
    const selectedDate = new Date(formData.dueDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        errors.dueDate = 'Due date cannot be in the past.';
    }
}

  // Dependency validation (Self-dependency, Duplicate, Circular dependency)
  if (Array.isArray(formData.dependsOn) && formData.dependsOn.length > 0) {
    // 1. Self dependency check
    if (currentTaskId && formData.dependsOn.includes(currentTaskId)) {
      errors.dependsOn = 'A task cannot depend on itself.';
    }

    // 2. Cycle detection check
    if (!errors.dependsOn) {
      const targetId = currentTaskId || 'temp-new-task';
      for (const depId of formData.dependsOn) {
        const cycleResult = detectCycle(targetId, depId, existingTasks);
        if (cycleResult.hasCycle) {
          errors.dependsOn = `Circular dependency detected: ${cycleResult.cycleChain.join(' → ')}`;
          break;
        }
      }
    }
  }

  // Status vs Dependency validation
  if ((formData.status === 'In Progress' || formData.status === 'Done') && Array.isArray(formData.dependsOn) && formData.dependsOn.length > 0) {
    const taskMap = new Map(existingTasks.map(t => [t.id, t]));
    const hasIncompleteDep = formData.dependsOn.some(depId => {
      const dep = taskMap.get(depId);
      return !dep || dep.status !== 'Done';
    });
    if (hasIncompleteDep) {
      errors.status = `Cannot set status to "${formData.status}" while prerequisite dependencies are incomplete.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Render error messages dynamically under form fields
export const renderFormErrors = (formElement, errors) => {
  // Clear previous errors
  const errorElements = formElement.querySelectorAll('.form-error');
  errorElements.forEach(el => {
    el.textContent = '';
    el.classList.remove('active');
  });

  // Display active errors
  Object.keys(errors).forEach(field => {
    const errorEl = formElement.querySelector(`#error-${field}`);
    if (errorEl) {
      errorEl.textContent = errors[field];
      errorEl.classList.add('active');
    }
  });
};
