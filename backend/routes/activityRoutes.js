import express from 'express';
import { getActivity, addActivity, clearActivity } from '../controllers/activityController.js';

const router = express.Router();

router.route('/')
  .get(getActivity)
  .post(addActivity)
  .delete(clearActivity);

export default router;
