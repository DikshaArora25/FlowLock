import express from 'express';
import { getActivity, getActivityStats, addActivity, clearActivity } from '../controllers/activityController.js';

const router = express.Router();

router.get('/stats', getActivityStats);

router.route('/')
  .get(getActivity)
  .post(addActivity)
  .delete(clearActivity);

export default router;
