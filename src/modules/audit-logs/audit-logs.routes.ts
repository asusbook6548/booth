import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { getAuditLogsController } from "./audit-logs.controller.js";

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get paginated audit logs with search and filtering
 *     tags:
 *       - Audit Logs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts at 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records per page (1 to 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search case-insensitively across action, entity, user name/email, volunteer name/mobile
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by AuditLog.action
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by AuditLog.entity
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter admin-generated logs by User UUID
 *       - in: query
 *         name: volunteerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter volunteer-generated logs by Volunteer UUID
 *       - in: query
 *         name: voterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter logs related to a Voter UUID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created on or after this ISO datetime
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created on or before this ISO datetime
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
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
 *                   example: Audit logs fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Admin authentication token is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authMiddleware, getAuditLogsController);

export default router;
