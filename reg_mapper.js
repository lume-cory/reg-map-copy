// index.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 5001;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

app.post('/create-mapping', async (req, res) => {
  const { regulation, securityControl, companyPolicy } = req.body;
  
  // Query to fetch and combine data
  try {
    const query = `
      SELECT
        dr.article_number AS "Article",
        dr.sub_article_number AS "Sub Article",
        dr.requirement_description AS "Requirement Description",
        cp.profile_id AS "Control ID",
        (SELECT policy_id FROM company_policies WHERE version = $3) AS "Policy ID"
      FROM dora_requirements dr
      LEFT JOIN dora_cri_mapping dm ON dm.dora_requirement_id = dr.requirement_id
      LEFT JOIN cri_profiles cp ON cp.profile_id = dm.cri_profile_id;
    `;

    const params = [regulation, securityControl, companyPolicy];
    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error executing query', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
