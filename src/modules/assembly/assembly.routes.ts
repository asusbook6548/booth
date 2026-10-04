import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { create, getOne } from "./assembly.controller";

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/assemblies:
 *   post:
 *     summary: One-time assembly setup
 *     description: |
 *       Creates the assembly for this deployment.
 *       Returns **409 Conflict** if an assembly is already configured.
 *       V3.1.1 supports exactly ONE assembly per deployment.
 *       isActive is automatically set to true.
 *     tags: [Assemblies]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - name
 *               - district
 *               - electionYear
 *             properties:
 *               number:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *                 example: "173"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Lucknow East
 *               district:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Lucknow
 *               electionYear:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *                 example: 2026
 *     responses:
 *       201:
 *         description: Assembly created successfully
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
 *                   example: Assembly created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     assembly:
 *                       $ref: '#/components/schemas/Assembly'
 *       400:
 *         description: Validation error
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
 *       409:
 *         description: Assembly already configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", create);

/**
 * @swagger
 * /api/assemblies:
 *   get:
 *     summary: Get the configured assembly
 *     description: |
 *       Returns the single assembly configured for this deployment.
 *       Returns **404** if no assembly has been set up yet.
 *       Does NOT return a list — V3.1.1 has exactly one assembly.
 *     tags: [Assemblies]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Assembly fetched successfully
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
 *                     assembly:
 *                       $ref: '#/components/schemas/Assembly'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No assembly configured yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Data integrity error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getOne);

export default router;
