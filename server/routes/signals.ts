import { Router, Request, Response } from 'express';
import { asyncHandler, createValidationError } from '../utils/error-handler';
import { supabase } from '../index';

const router = Router();

/**
 * POST /api/signals/behavioral
 * Log behavioral signal
 */
router.post('/behavioral', asyncHandler(async (req: Request, res: Response) => {
  const { userId, action, metadata, timestamp } = req.body;

  if (!userId || !action) {
    throw createValidationError('userId and action are required');
  }

  const { data, error } = await supabase
    .from('behavioral_signals')
    .insert({
      user_id: userId,
      action,
      metadata,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) throw error;
  res.json({ success: true, data });
}));

/**
 * POST /api/signals/emotional
 * Log emotional signal
 */
router.post('/emotional', asyncHandler(async (req: Request, res: Response) => {
  const { userId, emotion, intensity, context, timestamp } = req.body;

  if (!userId || !emotion) {
    throw createValidationError('userId and emotion are required');
  }

  const { data, error } = await supabase
    .from('emotional_signals')
    .insert({
      user_id: userId,
      emotion,
      intensity: intensity || 0.5,
      context,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) throw error;
  res.json({ success: true, data });
}));

/**
 * POST /api/signals/knowledge
 * Log knowledge signal
 */
router.post('/knowledge', asyncHandler(async (req: Request, res: Response) => {
  const { userId, concept, mastery, confidence, timestamp } = req.body;

  if (!userId || !concept) {
    throw createValidationError('userId and concept are required');
  }

  const { data, error } = await supabase
    .from('knowledge_signals')
    .insert({
      user_id: userId,
      concept,
      mastery_level: mastery || 0,
      confidence: confidence || 0.5,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) throw error;
  res.json({ success: true, data });
}));

/**
 * POST /api/signals/context
 * Log context signal
 */
router.post('/context', asyncHandler(async (req: Request, res: Response) => {
  const { userId, location, device, environment, timestamp } = req.body;

  if (!userId) {
    throw createValidationError('userId is required');
  }

  const { data, error } = await supabase
    .from('context_signals')
    .insert({
      user_id: userId,
      location,
      device,
      environment,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) throw error;
  res.json({ success: true, data });
}));

/**
 * POST /api/signals/outcome
 * Log outcome signal
 */
router.post('/outcome', asyncHandler(async (req: Request, res: Response) => {
  const { userId, result, score, feedback, timestamp } = req.body;

  if (!userId || result === undefined) {
    throw createValidationError('userId and result are required');
  }

  const { data, error } = await supabase
    .from('outcome_signals')
    .insert({
      user_id: userId,
      result,
      score: score || 0,
      feedback,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) throw error;
  res.json({ success: true, data });
}));

/**
 * GET /api/signals/:userId
 * Get all signals for user
 */
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (error) throw error;
  res.json({ signals: data, total: data?.length });
}));

/**
 * POST /api/signals/batch
 * Batch insert signals
 */
router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  const { signals } = req.body;

  if (!Array.isArray(signals) || signals.length === 0) {
    throw createValidationError('signals array is required and must not be empty');
  }

  const { data, error } = await supabase
    .from('signals')
    .insert(signals.map(s => ({
      ...s,
      timestamp: s.timestamp || new Date().toISOString(),
    })));

  if (error) throw error;
  res.json({ success: true, inserted: data?.length });
}));

export default router;
