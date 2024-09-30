const express = require('express');
const { Pool } = require('pg');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 5001;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// OpenAI API configuration (replace with your API key)
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key
}));

// Utility function to compare DORA requirement to CRI profiles
const mapDoraToCRI = async () => {
  try {
    // Fetch all DORA requirements
    const doraRequirementsResult = await pool.query('SELECT * FROM dora_requirements');
    const doraRequirements = doraRequirementsResult.rows;

    // Fetch all CRI profiles for comparison
    const criProfilesResult = await pool.query('SELECT * FROM cri_profiles');
    const criProfiles = criProfilesResult.rows;

    // Iterate through each DORA requirement
    for (const doraRequirement of doraRequirements) {
      const { requirement_id, requirement_description } = doraRequirement;

      // Compare each DORA requirement to each CRI profile using the LLM
      for (const criProfile of criProfiles) {
        const { profile_id, cri_profile_v2_diagnostic_statement } = criProfile;

        // Use LLM to analyze the semantic match
        const prompt = `
        Determine if the following DORA requirement matches the CRI profile control:

        DORA Requirement: "${requirement_description}"

        CRI Profile Control: "${cri_profile_v2_diagnostic_statement}"

        Respond with "YES" if they are related and "NO" otherwise.
        `;

        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: prompt,
          max_tokens: 5,
        });

        const matchDecision = response.data.choices[0].text.trim();

        // If the LLM finds a match, insert into the mapping table
        if (matchDecision.toUpperCase() === 'YES') {
          await pool.query(`
            INSERT INTO dora_cri_mapping (dora_requirement_id, cri_profile_id, mapping_details)
            VALUES ($1, $2, $3)
          `, [requirement_id, profile_id, `Matched based on LLM reasoning`]);
        }
        else {
            await pool.query(`
                INSERT INTO dora_cri_mapping (dora_requirement_id, cri_profile_id, mapping_details)
                VALUES ($1, $2, $3)
                `, [requirement_id, NULL, `LLM reasoning determined there was no match`]);
        }
      }
    }

    console.log('Mapping completed successfully with LLM!');
  } catch (error) {
    console.error('Error mapping DORA to CRI:', error);
  }
};

// Endpoint to trigger mapping
app.get('/map-dora-cri', async (req, res) => {
  try {
    await mapDoraToCRI();
    res.status(200).send('Mapping initiated successfully!');
  } catch (error) {
    res.status(500).send('An error occurred during mapping.');
  }
});

// Start Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
