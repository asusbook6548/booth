import { Router } from "express";
import { volunteerAuthMiddleware } from "../../middleware/volunteer-auth.middleware";
import {
  getVoters,
  getOneVoter,
  updateVoter,
} from "./volunteer-voters.controller";

const router = Router();

router.use(volunteerAuthMiddleware);

/**
 * @swagger
 * /api/volunteer-voters:
 *   get:
 *     summary: Get voters in volunteer's assigned booth
 *     tags: [Volunteer Voters]
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
 *         description: Search voters by name, epic, mobile, etc.
 *       - in: query
 *         name: classification
 *         schema:
 *           type: string
 *           enum: [GREEN, YELLOW, RED, BLACK]
 *         description: Filter by voter classification
 *       - in: query
 *         name: verification
 *         schema:
 *           type: string
 *           enum: [VERIFIED, UNVERIFIED]
 *         description: Filter by verification status
 *       - in: query
 *         name: voteStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, DONE]
 *         description: Filter by vote status
 *     responses:
 *       200:
 *         description: Booth voters fetched successfully
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
 *                   example: Booth voters fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     voters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Voter'
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Fetch failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Volunteer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getVoters);

/**
 * @swagger
 * /api/volunteer-voters/{id}:
 *   patch:
 *     summary: Update a voter in volunteer's booth
 *     tags: [Volunteer Voters]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Voter UUID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classification:
 *                 type: string
 *                 enum: [GREEN, YELLOW, RED, BLACK]
 *                 example: GREEN
 *               verification:
 *                 type: string
 *                 enum: [VERIFIED, UNVERIFIED]
 *                 example: VERIFIED
 *               voteStatus:
 *                 type: string
 *                 enum: [PENDING, DONE]
 *                 example: PENDING
 *     responses:
 *       200:
 *         description: Voter updated successfully
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
 *                   example: Voter updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Voter'
 *       400:
 *         description: Validation error or update failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Volunteer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Voter does not belong to volunteer's assigned booth or volunteer inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Voter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/volunteer-voters/{id}:
 *   get:
 *     summary: Get single voter profile in volunteer's booth
 *     tags: [Volunteer Voters]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Voter UUID
 *     responses:
 *       200:
 *         description: Voter fetched successfully
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
 *                   example: Voter fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/Voter'
 *       401:
 *         description: Volunteer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Voter does not belong to volunteer's assigned booth or volunteer inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Voter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getOneVoter);
router.patch("/:id", updateVoter);

export default router;
