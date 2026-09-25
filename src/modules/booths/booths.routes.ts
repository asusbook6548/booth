import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";

import {
  create,
  getAll,
  getOne,
  update,
} from "./booths.controller";

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/booths:
 *   post:
 *     summary: Create a new polling booth
 *     tags: [Booths]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boothNumber
 *               - name
 *             properties:
 *               boothNumber:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *                 example: "12A"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 150
 *                 example: Booth 12A
 *               village:
 *                 type: string
 *                 maxLength: 150
 *                 example: Shahdara
 *               assemblyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Booth created successfully
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
 *                   example: Booth created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     booth:
 *                       $ref: '#/components/schemas/Booth'
 *       400:
 *         description: Validation error or creation failed
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
router.post("/", create);

/**
 * @swagger
 * /api/booths:
 *   get:
 *     summary: Get all polling booths
 *     tags: [Booths]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assemblyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by assembly UUID
 *     responses:
 *       200:
 *         description: Booths fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     booths:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booth'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getAll);

/**
 * @swagger
 * /api/booths/{id}:
 *   get:
 *     summary: Get a single booth by ID
 *     tags: [Booths]
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
 *         description: Booth fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     booth:
 *                       $ref: '#/components/schemas/Booth'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booth not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getOne);

/**
 * @swagger
 * /api/booths/{id}:
 *   patch:
 *     summary: Update a polling booth
 *     tags: [Booths]
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boothNumber:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *                 example: "12B"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 150
 *                 example: Updated Booth Name
 *               village:
 *                 type: string
 *                 maxLength: 150
 *                 example: Updated Village
 *               status:
 *                 type: string
 *                 enum: [NOT_STARTED, VOTING_STARTED, PROBLEM]
 *                 example: VOTING_STARTED
 *     responses:
 *       200:
 *         description: Booth updated successfully
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
 *                   example: Booth updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     booth:
 *                       $ref: '#/components/schemas/Booth'
 *       400:
 *         description: Validation error or update failed
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
router.patch("/:id", update);

export default router;
