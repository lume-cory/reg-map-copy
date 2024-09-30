
from openai import OpenAI

client = OpenAI(api_key='placeholder')
import pandas as pd
import psycopg2
from sqlalchemy import create_engine
import time

# Configuration: replace with your actual API key and database connection details
database_url = 'postgresql://cory_dunton:local@localhost:5432/reg_mapping'

# Initialize database connection using SQLAlchemy
engine = create_engine(database_url)

# Load CSV data into DataFrame
df = pd.read_csv("~/Documents/Projects/reg-map/files/CRI Profile v2.0 Assessment.csv")

# Batch size (number of rows per API call)
batch_size = 50  # Adjust based on your testing and OpenAI's response limitations

# Function to create batched prompts and process responses
def process_batch(batch_df):
    # Create a combined prompt for all rows in the batch
    prompts = []
    for index, row in batch_df.iterrows():
        prompt = (
            f"Summarize the following into a company security policy statement:\n"
            f"Diagnostic Statement: {row['CRI Profile v2.0 Diagnostic Statement']}\n"
            f"Response Guidance: {row['Response Guidance']}\n"
            f"Examples of Evidence: {row['Examples of Effective Evidence']}\n"
            f"Subject Tags: {row['Profile Subject Tags']}\n"
            f"Determine the organizational owner.\n\n"
        )
        prompts.append(prompt)
    combined_prompt = "\n---\n".join(prompts)

    # Send the combined prompt to the OpenAI API
    response = openai.Completion.create(
        model="text-davinci-003",
        prompt=combined_prompt,
        max_tokens=150 * len(batch_df)
    )

    return response.choices[0].text.strip().split('\n---\n')

# Process the DataFrame in batches
for start in range(0, len(df), batch_size):
    end = start + batch_size
    batch_df = df.iloc[start:end]
    summaries = process_batch(batch_df)

    for summary, (_, row) in zip(summaries, batch_df.iterrows()):
        parts = summary.split('\n')
        if len(parts) >= 3:
            category = parts[0]
            policy_text = parts[1]
            owner = parts[2]

            # Prepare SQL insert statement
            insert_query = """
            INSERT INTO org_sec_policy (category, policy_text, owner, version)
            VALUES (%s, %s, %s, '1.0');
            """
            with engine.connect() as connection:
                connection.execute(insert_query, (category, policy_text, owner))
                print(f"Inserted policy for {owner}")

    # Sleep to respect rate limits
    time.sleep(20)

print("Data insertion complete.")