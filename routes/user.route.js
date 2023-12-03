import express from 'express';
import { deleteUser, test, updateUser,  getUserListings, getUser,addFavorite,getFavoriteListings,removeFavorite, checkFavorite,createSchedule, getSchedule, acceptSchedule, updateScheduleStatusAccept, updateScheduleStatusReject} from '../controllers/user.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

router.get('/test', test);
router.post('/update/:id', updateUser)
router.delete('/delete/:id', verifyToken, deleteUser)
router.get('/listings/:id', verifyToken, getUserListings)
router.get('/:id', getUser)
router.get('/:id/favorite', getFavoriteListings);
router.post('/:userId/favorite/:listingId', addFavorite);
router.get('/:userId/checkfavorite/:listingId', checkFavorite);
router.delete('/:userId/favorite/:listingId', removeFavorite);
router.post('/:senderId/schedule/:receiverId/:listingId/:date', createSchedule);
router.get('/schedules/:userId',getSchedule)
router.get('/acceptschedules/:userId',acceptSchedule)
router.post('/schedule/:scheduleId/accept',updateScheduleStatusAccept)
router.post('/schedule/:scheduleId/reject',updateScheduleStatusReject)

export default router;