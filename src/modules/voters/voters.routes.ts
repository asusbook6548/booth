import { Router } from "express";

import {
  authMiddleware,
} from "../../middleware/auth.middleware";

import {
  getAllVoters,
  getOneVoter,
  updateOneVoter,
} from "./voters.controller";

import {
  importVoterFile,
} from "./voter-import.controller";

import { upload } from "../../config/upload";

const router = Router();

/**
 * All voter APIs are Admin protected
 */
router.use(authMiddleware);

/**
 * @swagger
 * /api/voters/import:
 *   post:
 *     summary: Import voters from Excel/CSV file
 *     description: |
 *       Imports voters from an Excel (.xlsx / .xls) or CSV file.
 *
 *       **Assembly**: Automatically determined from server configuration.
 *       The caller must NOT pass assemblyId — the backend uses getCurrentAssembly().
 *
 *       **Booth**: Automatically created if a booth with the given partNo does not
 *       exist for the current assembly. No duplicate booths are created.
 *
 *       **Smart Merge**: Existing voters (matched by assemblyId + epic) are updated
 *       with official/imported data. Field-team data (mobile, classification,
 *       verification, voteStatus) is NOT overwritten on update.
 *
 *       **Supported formats**: .xlsx, .xls, .csv
 *
 *       **Required columns**: epicNo, epicName, partNo
 *
 *       **Optional columns**: epicName1, Gender, mobileNo, enrollDob, Age,
 *       fathersOrGuardian, fathersOrGuardianHindi, mothersName, spouseName,
 *       houseNo, acNo, partSerial, pollingStation
 *
 *       **Booth number column**: partNo (NOT pollingStation)
 *
 *       **Booth name**: pollingStation (used when auto-creating a missing booth)
 *     tags: [Voters]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx / .xls) or CSV file containing voter data
 *     responses:
 *       200:
 *         description: Voter file imported successfully
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
 *                   example: Voter file imported successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fileName:
 *                       type: string
 *                       example: voters.xlsx
 *                     fileType:
 *                       type: string
 *                       example: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 *                     status:
 *                       type: string
 *                       enum: [UPLOADED, REVIEWING, COMMITTED, FAILED]
 *                       example: COMMITTED
 *                     totalRows:
 *                       type: integer
 *                       example: 1000
 *                     validRows:
 *                       type: integer
 *                       example: 990
 *                     duplicateRows:
 *                       type: integer
 *                       example: 5
 *                     errorRows:
 *                       type: integer
 *                       example: 5
 *                     importedRows:
 *                       type: integer
 *                       example: 990
 *                     newBoothsCreated:
 *                       type: integer
 *                       example: 7
 *                       description: Number of new booths automatically created during import
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Import failed or invalid file
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
 *       404:
 *         description: No assembly configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/import",
  upload.single("file"),
  importVoterFile
);

/**
 * @swagger
 * /api/voters:
 *   get:
 *     summary: Get all voters (admin) with filters and pagination
 *     tags: [Voters]
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
 *         description: Search by name, epic, mobile, house number, etc.
 *       - in: query
 *         name: assemblyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by assembly UUID
 *       - in: query
 *         name: boothId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by booth UUID
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
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *         description: Filter by gender
 *     responses:
 *       200:
 *         description: Voters fetched successfully
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
 *                   example: Voters fetched successfully
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
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/",
  getAllVoters
);

/**
 * @swagger
 * /api/voters/{id}:
 *   get:
 *     summary: Get a single voter by ID (admin)
 *     tags: [Voters]
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
 *         description: Unauthorized
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
router.get(
  "/:id",
  getOneVoter
);

/**
 * @swagger
 * /api/voters/{id}:
 *   patch:
 *     summary: Update a voter (admin)
 *     tags: [Voters]
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
 *               mobile:
 *                 type: string
 *                 maxLength: 20
 *                 nullable: true
 *                 example: "9876543210"
 *               classification:
 *                 type: string
 *                 enum: [GREEN, YELLOW, RED, BLACK]
 *                 nullable: true
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
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  updateOneVoter
);

export default router;
