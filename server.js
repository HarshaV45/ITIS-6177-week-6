const express = require("express");
const app = express();
const port = 3000;
const mariadb = require("mariadb");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { body, param, query, validationResult } = require('express-validator');
const axios = require('axios');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sample',
  port: 3306,
  connectionsLimit: 100,
  acquireTimeout: 30000,
});

app.use(express.json());

// Function to get a new database connection
async function connectToDatabase() {
  try {
    return await pool.getConnection();
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Internal server error');
  }
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sample API',
      version: '1.0.0',
      description: 'A sample API for managing customers, foods, and orders',
    },
  },
  apis: ['./harsha.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


/**
 * @swagger
 * /api/company:
 *   post:
 *     summary: Create a new company
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: The unique identifier of the company
 *               companyName:
 *                 type: string
 *                 description: The name of the company
 *               companyCity:
 *                 type: string
 *                 description: The city where the company is located
 *     responses:
 *       201:
 *         description: Company successfully added
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Server error
 */
app.post(
  "/api/company",
  [
    body("companyId").trim().isLength({ min: 1, max: 6 }).escape(),
    body("companyName").trim().isLength({ min: 1, max: 25 }).escape(),
    body("companyCity").trim().isLength({ min: 1, max: 25 }).escape(),
  ],
  async (req, res) => {
    const connection = await connectToDatabase();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId, companyName, companyCity } = req.body;

    try {
      await connection.query(
        "INSERT INTO company (COMPANY_ID, COMPANY_NAME, COMPANY_CITY) VALUES (?, ?, ?)",
        [companyId, companyName, companyCity]
      );
      res.status(201).json({ message: "Company successfully added" });
    } catch (err) {
      console.error("Error adding Company:", err);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  }
);

/**
 * @swagger
 * /api/company/{companyId}:
 *   patch:
 *     summary: Update a company's information
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique ID of the company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: The name of the company
 *               companyCity:
 *                 type: string
 *                 description: The city where the company is located
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: Validation errors or missing update fields
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
app.patch(
  "/api/company/:companyId",
  [
    param("companyId")
    .trim().isLength({ min: 1, max: 6 }).escape()
    .withMessage("ID must be between 1 and 6 characters"),
    body("companyName").trim().isLength({ min: 1, max: 25 }).escape(),
    body("companyCity").trim().isLength({ min: 1, max: 25 }).escape(),
  ],
  async (req, res) => {
    const connection = await connectToDatabase();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId } = req.params;
    const { companyName, companyCity } = req.body;

    if (!companyName && !companyCity) {
      return res.status(400).json({
        error: "Provide at least one field to update (companyName or companyCity)",
      });
    }

    try {
      const updateFields = [];
      const values = [];

      if (companyName) {
        updateFields.push("COMPANY_NAME = ?");
        values.push(companyName);
      }
      if (companyCity) {
        updateFields.push("COMPANY_CITY = ?");
        values.push(companyCity);
      }

      const query =
        "UPDATE company SET " + updateFields.join(", ") + " WHERE COMPANY_ID = ?";
      values.push(companyId);

      const result = await connection.query(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json({ message: "Company updated successfully" });
    } catch (err) {
      console.error("Error updating Company:", err);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  }
);

/**
 * @swagger
 * /api/company/{companyId}:
 *   put:
 *     summary: Add or update a company
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique ID of the company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: The name of the company
 *               companyCity:
 *                 type: string
 *                 description: The city where the company is located
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: Validation errors or missing update fields
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
app.put(
  "/api/company/:companyId",
  [
    param("companyId")
    .trim().isLength({ min: 1, max: 6 }).escape()
    .withMessage("ID must be between 1 and 6 characters"),
    body("companyName").trim().isLength({ min: 1, max: 25 }).escape(),
    body("companyCity").trim().isLength({ min: 1, max: 25 }).escape(),
  ],
  async (req, res) => {
    const connection = await connectToDatabase();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId } = req.params;
    const { companyName, companyCity } = req.body;

    try {
      const result = await connection.query(
        "INSERT INTO company (COMPANY_ID, COMPANY_NAME, COMPANY_CITY) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE COMPANY_NAME = ?, COMPANY_CITY = ?",
        [companyId, companyName, companyCity, companyName, companyCity]
      );

      if (result.affectedRows === 1 && result.warningStatus === 0) {
        res.status(201).json({ message: "Company added" });
      } else {
        res.json({ message: "Company updated" });
      }
    } catch (err) {
      console.error("Error in upsert operation:", err);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  }
);



/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Retrieve a list of customer names
 *     responses:
 *       200:
 *         description: A list of customer names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customerList:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get('/api/customers', async (req, res) => {
  try {
    req.db = await connectToDatabase();
    const rows = await req.db.query('SELECT CUST_NAME FROM customer');
    const customerNames = rows.map(row => row.CUST_NAME);
    res.json({ customerList: customerNames });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Retrieve a list of student names
 *     responses:
 *       200:
 *         description: A list of student names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 studentList:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get('/api/students', async (req, res) => {
  try {
    req.db = await connectToDatabase();
    const rows = await req.db.query('SELECT NAME FROM student');
    const studentNames = rows.map(row => row.NAME);
    res.json({ studentList: studentNames });
  } catch (err) {
    console.error('Error fetching Students:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/foods:
 *   get:
 *     summary: Retrieve a list of food item names
 *     responses:
 *       200:
 *         description: A list of food item names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 foodList:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get('/api/foods', async (req, res) => {
  try {
    req.db = await connectToDatabase();
    const rows = await req.db.query('SELECT ITEM_NAME FROM foods');
    const customerNames = rows.map(row => row.ITEM_NAME);
    res.json({ foodList: customerNames });
  } catch (err) {
    console.error('Error fetching foods:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/customers/{custCode}:
 *   delete:
 *     summary: Delete a customer
 *     parameters:
 *       - in: path
 *         name: custCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 */
app.delete('/api/customers/:custCode', [
  param('custCode').isLength({ min: 6, max: 6 }).withMessage('Customer code must be 6 characters long'),
], async (req, res) => {
  req.db = await connectToDatabase();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { custCode } = req.params;

  try {
    const result = await req.db.query('DELETE FROM customer WHERE CUST_CODE = ?', [custCode]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

app.get(
  '/say',
  [
    query('keyword')
      .exists().withMessage('keyword query parameter is missing')
      .isString().withMessage('Keyword must be a string')
      .escape()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Keyword length must be between 1 and 100 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const keyword = req.query.keyword;

    try {
      const response = await axios.get('https://us-central1-spatial-framing-437923-h2.cloudfunctions.net/my-function', {
        params: { param: keyword }
      });
      res.status(200).json({"response": response.data});
    } catch (error) {
      console.error('Error calling function:', error.message);
    }
  }
);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});