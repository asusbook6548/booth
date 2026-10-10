import {
  Router,
} from "express";

import {
  authMiddleware,
} from "../../middleware/auth.middleware.js";

import {
  getOverview,
  getClassification,
  getVerification,
  getBooths,
  getBooth,
} from "./analytics.controller.js";

const router =
  Router();

// ========================================
// ANALYTICS
// ========================================

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get high-level analytics dashboard overview
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: boothId
 *         schema:
 *           type: string
 *         description: Optional Booth ID to filter dashboard overview booth-wise
 *     responses:
 *       200:
 *         description: Analytics overview fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Analytics overview fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Failed to fetch analytics overview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/overview",
  authMiddleware,
  getOverview
);

/**
 * @swagger
 * /api/analytics/classification:
 *   get:
 *     summary: Get detailed classification analytics breakdown
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Classification analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Classification analytics fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Failed to fetch classification analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/classification",
  authMiddleware,
  getClassification
);

/**
 * @swagger
 * /api/analytics/verification:
 *   get:
 *     summary: Get voter verification analytics breakdown
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification analytics fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Failed to fetch verification analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/verification",
  authMiddleware,
  getVerification
);

/**
 * @swagger
 * /api/analytics/booths:
 *   get:
 *     summary: Get analytics for all booths with pagination and search
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by booth number or name
 *     responses:
 *       200:
 *         description: Booth analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booth analytics fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Failed to fetch booth analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/booths",
  authMiddleware,
  getBooths
);

/**
 * @swagger
 * /api/analytics/booths/{id}:
 *   get:
 *     summary: Get analytics overview for a specific booth by ID
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booth UUID
 *     responses:
 *       200:
 *         description: Booth analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booth analytics fetched successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Failed to fetch booth analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/booths/:id",
  authMiddleware,
  getBooth
);

export default router;