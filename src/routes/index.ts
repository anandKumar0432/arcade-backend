import express , {Router} from 'express';
const router: Router = express.Router();
import userRouter from './user.js';
import tourRouter from './tour.js';
import publicRouter from './public.js'

router.use("/user",userRouter)
router.use("/tour",tourRouter)
router.use("/public", publicRouter)

export default router;