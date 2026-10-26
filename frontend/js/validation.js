import { detectCycle } from './dependencyEngine.js';
import { parseLocalDate } from './utils.js';

export const validateTaskForm = (formData, currentTaskId = null, existingTasks = []) => {
  const errors = {};

  if (!formData.title || formData.title.trim() === '') {
    errors.title = 'Task title is required.';
  } else if (formData.title.trim().length < 3) {
    errors.title = 'Task title must be at least 3 characters.';
  }

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

  if (!formData.description || formData.description.trim() === '') {
    errors.description = 'Description is required.';
  }

  // Due date validation (using local date parsing to avoid UTC offset bugs)
  if (formData.dueDate) {
    const selectedDate = parseLocalDate(formData.dueDate);
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate.getTime() < today.getTime()) {
        errors.dueDate = 'Due date cannot be in the past.';
      }
    }
  }

  // Dependency validation (Self-dependency, Duplicate, Circular dependency)
  if (Array.isArray(formData.dependsOn) && formData.dependsOn.length > 0) {
    if (currentTaskId && formData.dependsOn.includes(currentTaskId)) {
      errors.dependsOn = 'A task cannot depend on itself.';
    } else {
      const targetId = currentTaskId || 'temp-new-task';
      const cycleResult = detectCycle(targetId, formData.dependsOn, existingTasks);
      if (cycleResult.hasCycle) {
        errors.dependsOn = `Circular dependency detected: ${cycleResult.cycleChain.join(' → ')}`;
      }
    }
  }

  // Status vs Dependency validation: Enforce only when actively transitioning to In Progress / Done
  const currentTask = currentTaskId ? existingTasks.find(t => t.id === currentTaskId) : null;
  const isStatusTransition = !currentTask || currentTask.status !== formData.status;

  if (isStatusTransition && (formData.status === 'In Progress' || formData.status === 'Done') && Array.isArray(formData.dependsOn) && formData.dependsOn.length > 0) {
    const taskMap = new Map(existingTasks.map(t => [t.id, t]));
    const hasIncompleteDep = formData.dependsOn.some(depId => {
      const dep = taskMap.get(depId);
      return dep && dep.status !== 'Done';
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

export const renderFormErrors = (formElement, errors) => {
  const errorElements = formElement.querySelectorAll('.form-error');
  errorElements.forEach(el => {
    el.textContent = '';
    el.classList.remove('active');
  });

  Object.keys(errors).forEach(field => {
    const errorEl = formElement.querySelector(`#error-${field}`);
    if (errorEl) {
      errorEl.textContent = errors[field];
      errorEl.classList.add('active');
    }
  });
};
