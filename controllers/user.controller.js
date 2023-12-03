import bcryptjs from 'bcryptjs';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import Listing from '../models/listing.model.js';
import Schedule from '../models/schedule.model.js';
export const test = (req, res) => {
  res.json({
    message: 'Api route is working!',
  });
};

export const updateUser = async (req, res, next) => {
  try {
    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          avatar: req.body.avatar,
        },
      },
      { new: true }
    );
    const { password, ...rest } = updatedUser._doc;

    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, 'You can only delete your own account!'));
  try {
    await User.findByIdAndDelete(req.params.id);
    res.clearCookie('access_token');
    res.status(200).json('User has been deleted!');
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req, res, next) => {
  if (req.user.id === req.params.id) {
    try {
      const listings = await Listing.find({ userRef: req.params.id });
      res.status(200).json(listings);
    } catch (error) {
      next(error);
    }
  } else {
    return next(errorHandler(401, 'You can only view your own listings!'));
  }
};

export const getUser = async (req, res, next) => {
  try {
    
    const user = await User.findById(req.params.id);
  
    if (!user) return next(errorHandler(404, 'User not found!'));
  
    const { password: pass, ...rest } = user._doc;
  
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const { listingId,userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.favorites.includes(listingId)) {
      user.favorites.push(listingId);
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const getFavoriteListings = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('favorites');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const favoriteListingIds = user.favorites; 

    const favoriteListings = await Listing.find({ _id: { $in: favoriteListingIds } });

    return res.status(200).json(favoriteListings);
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const { listingId,userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.favorites.includes(listingId)) {
      user.favorites = user.favorites.filter((id) => id !== listingId);
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};


export const checkFavorite = async (req, res, next) => {
  try {
    const { listingId, userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFavorite = user.favorites.includes(listingId);
    return res.status(200).json({ response :isFavorite });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const { senderId, receiverId, listingId, date } = req.params;

    const existingSchedule = await Schedule.findOne({
      fromUser: senderId,
      toUser: receiverId,
      listingId: listingId,
    });

    if(senderId == receiverId){
      return res.status(401).json({ error: 'You cant schedule your own listings' });
    }
    if (existingSchedule) {
      return res.status(400).json({ error: 'Schedule already exists' });
    }

    const newRequest = new Schedule({
      fromUser: senderId,
      toUser: receiverId,
      listingId: listingId,
      requestedTime: date
    });

    const savedRequest = await newRequest.save();
    console.log(Date.now());

    res.status(201).json({ message: 'Schedule created successfully', schedule: savedRequest });

  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
};


export const getSchedule = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const schedule = await Schedule.find({ fromUser: userId });

    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const scheduleWithDetails = [];

    for (const item of schedule) {
      const listing = await Listing.findOne({ _id: item.listingId });
      const user = await User.findOne({ _id: item.toUser });

      if (listing && user) {
        const scheduleItem = {
          id:item._id,
          status: item.status,
          requestTime: item.requestedTime,
          listingDetails: listing,
          userDetails: user,
        };

        scheduleWithDetails.push(scheduleItem);
      }
    }

    res.status(200).json(scheduleWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    next(error);
  }
};

export const acceptSchedule = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const schedule = await Schedule.find({ toUser: userId });

    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    const scheduleWithDetails = [];

    for (const item of schedule) {
      const listing = await Listing.findOne({ _id: item.listingId });
      const user = await User.findOne({ _id: item.toUser });

      if (listing && user) {
        const currentDate = new Date();
        const requestDateTime = new Date(item.requestedTime);
        if (requestDateTime <= currentDate) {
          await Schedule.findByIdAndUpdate(item._id, { status: 'rejected' });
          item.status = 'rejected';
        }

        const scheduleItem = {
          id: item._id,
          status: item.status,
          requestTime: item.requestedTime,
          listingDetails: listing,
          userDetails: user,
        };

        scheduleWithDetails.push(scheduleItem);
      }
    }

    res.status(200).json(scheduleWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    next(error);
  }
};


export const updateScheduleStatusAccept = async (req, res, next) => {
  try {
    const { scheduleId } = req.params; 
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { status: 'accepted' },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.status(200).json(updatedSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    next(error);
  }
};
export const updateScheduleStatusReject = async (req, res, next) => {
  try {
    const { scheduleId } = req.params; 
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { status: 'rejected' },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.status(200).json(updatedSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    next(error);
  }
};
