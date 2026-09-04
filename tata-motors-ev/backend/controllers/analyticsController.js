const Lead = require('../models/Lead');
const Booking = require('../models/Booking');
const ChatSession = require('../models/ChatSession');

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLeads, newLeads, convertedLeads, totalBookings, pendingBookings,
      totalChats, recentChats, leadsByStatus, leadsBySource, bookingsByType
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Lead.countDocuments({ status: 'converted' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      ChatSession.countDocuments(),
      ChatSession.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
    ]);

    // Daily leads for last 7 days
    const dailyLeads = await Lead.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        totalLeads, newLeads, convertedLeads, conversionRate: parseFloat(conversionRate),
        totalBookings, pendingBookings, totalChats, recentChats,
        leadsByStatus, leadsBySource, bookingsByType, dailyLeads
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
