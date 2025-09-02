import express , {Router} from 'express';
const router: Router = express.Router();
import userRouter from './user.js';
import tourRouter from './tour.js';

router.use("/user",userRouter)
router.use("/tour",tourRouter)

export default router;