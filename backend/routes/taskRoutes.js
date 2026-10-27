import express from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  resetDemoTasks,
  importTasks
} from '../controllers/taskController.js';
import { validateCreateTask, validateUpdateTask } from '../middleware/validateTask.js';

const router = express.Router();

router.route('/')
  .get(getTasks)
  .post(validateCreateTask, createTask);

router.post('/reset-demo', resetDemoTasks);
router.post('/import', importTasks);

router.route('/:id')
  .get(getTaskById)
  .patch(validateUpdateTask, updateTask)
  .delete(deleteTask);

export default router;
