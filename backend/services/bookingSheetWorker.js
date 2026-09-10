const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { configured, writeBooking } = require('./bookingSheet');
const leaseSchema = new mongoose.Schema({ _id: String, owner: String, until: Date });
const Lease = mongoose.models.BookingSheetLease || mongoose.model('BookingSheetLease', leaseSchema);
const owner = crypto.randomUUID();
let busy = false;
async function tick({ write = writeBooking } = {}) {
  if (busy || !configured() || mongoose.connection.readyState !== 1) return;
  busy = true;
  let acquired = false;
  try {
    // One Google write sequence at a time across backend processes. Retry after crashes via lease expiry.
    const lease = await Lease.findOneAndUpdate({ _id: 'booking-sheet', $or: [{ until: { $lte: new Date() } }, { owner }] },
      { $set: { owner, until: new Date(Date.now() + 120000) } }, { upsert: true, new: true });
    acquired = lease.owner === owner;
    if (!acquired) return;
    const booking = await Booking.findOne({ 'sheetSync.status': { $in: ['queued', 'failed'] },
      $or: [{ 'sheetSync.nextAttemptAt': { $exists: false } }, { 'sheetSync.nextAttemptAt': { $lte: new Date() } }] }).sort({ 'sheetSync.nextAttemptAt': 1, createdAt: 1 });
    if (!booking) return;
    const version = booking.sheetSync.version;
    const filter = { _id: booking._id, 'sheetSync.version': version };
    try {
      await write(booking);
      await Booking.updateOne(filter, { $set: { 'sheetSync.status': 'synced', 'sheetSync.syncedAt': new Date(), 'sheetSync.error': '' },
        $unset: { 'sheetSync.nextAttemptAt': '' } });
    } catch (error) {
      // Never log Axios configs or Google credentials; only retain a safe diagnostic code.
      const attempts = (booking.sheetSync.attempts || 0) + 1;
      await Booking.updateOne(filter, { $set: { 'sheetSync.status': 'failed', 'sheetSync.attempts': attempts,
        'sheetSync.error': error.response?.status ? `Google HTTP ${error.response.status}` : 'Sheet sync failed; check server configuration and sheet permissions.',
        'sheetSync.nextAttemptAt': new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(attempts, 7))) } });
    }
  } catch (error) {
    if (error.code !== 11000) console.warn('Booking sheet worker could not acquire or process its queue.');
  } finally {
    if (acquired) await Lease.updateOne({ _id: 'booking-sheet', owner }, { $set: { until: new Date(0) } }).catch(() => {});
    busy = false;
  }
}
function startSheetWorker() {
  const timer = setInterval(() => { void tick(); }, 5000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
module.exports = { tick, startSheetWorker };
