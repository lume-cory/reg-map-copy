// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

// Default values
const regulations = ['DORA', 'GDPR', 'PCI DSS'];
const securityControls = ['CRI', 'ISO 27001', 'NIST'];
const companyPolicies = ['Security Policy v7', 'Privacy Policy v3', 'Data Retention Policy v2'];

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// // Example API endpoint
// app.get('/api/data', async (req, res) => {
//     try {
//         const result = await pool.query('SELECT * FROM your_table'); // Replace with your table
//         res.json(result.rows);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Database query failed' });
//     }
// });

// Define a route for the root URL
app.get('/', (req, res) => {
    res.send('Hello, World!'); // Send the Hello World message
});

// API Enpoints
app.get('/api/regulations', async (req, res) => {
    try {
        const result = await pool.query('SELECT regulation_name FROM security_regulations'); 
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
    // res.json(regulations);
});
  
app.get('/api/securityControls', async (req, res) => {
    try {
        const result = await pool.query('SELECT control_name,version FROM security_control_frameworks'); 
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
    // res.json(securityControls);

});

app.get('/api/companyPolicies', async (req, res) => {
    try {
        const result = await pool.query('SELECT policy_name,version FROM company_security_policies'); 
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
    // res.json(companyPolicies);
});

app.get('/api/dora_cri_mapping', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                dr.article_number AS "Article", 
                dr.sub_article_number AS "Sub Article", 
                dr.requirement_description AS "Requirement Description",
                cp.profile_id AS "CRI Profile",
                cp.profile_subcategory AS "Control Category",
                osp.policy_id AS "Security Policy ID"
            FROM dora_requirements dr
            LEFT JOIN dora_cri_mapping dcm ON dcm.dora_requirement_id = dr.requirement_id
            LEFT JOIN cri_profiles cp ON cp.outline_id = dcm.cri_profile_id
            LEFT JOIN cri_policy_mapping cpm ON cpm.cri_outline_id = cp.outline_id 
            LEFT JOIN org_sec_policy osp ON osp.policy_id = cpm.org_policy_id
            `);
        res.json(result.rows);
    }   catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed'});
    }
}
)
  
app.all('*', (req, res) => {
    res.status(404).send('resource not found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});