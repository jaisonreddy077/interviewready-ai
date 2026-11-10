import mongoose from 'mongoose';
import JobBoard from '../models/JobBoard.js';

export async function ownedBoard(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Job board not found.' });
    return null;
  }
  const board = await JobBoard.findOne({ _id: req.params.id, user: req.user.id });
  if (!board) res.status(404).json({ error: 'Job board not found.' });
  return board;
}
