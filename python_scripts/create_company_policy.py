from openai import OpenAI

client = OpenAI(api_key='placeholder')
import pandas as pd
import psycopg2
from sqlalchemy import create_engine

# Configuration: replace with your actual API key and database connection details
database_url = 'postgresql://cory_dunton:local@localhost:5432/reg_mapping'

# Initialize database connection using SQLAlchemy
engine = create_engine(database_url)

# Load CSV data into DataFrame
df = pd.read_csv("~/Documents/Projects/reg-map/files/CRI Profile v2.0 Assessment.csv")

# Function to prompt the LLM for summarizing policy details
def summarize_policy(row):
    print("Sending request to OpenAI with the following data:")
    print(f"Diagnostic Statement: {row['CRI Profile v2.0 Diagnostic Statement']}")
    print(f"Response Guidance: {row['Response Guidance']}")
    print(f"Examples of Evidence: {row['Examples of Effective Evidence']}")
    print(f"Subject Tags: {row['Profile Subject Tags']}")

    response = client.completions.create(model="gpt-3.5-turbo",  # Use an appropriate model
    prompt=f"Summarize the following into a security policy statement:\n"
           f"Diagnostic Statement: {row['CRI Profile v2.0 Diagnostic Statement']}\n"
           f"Response Guidance: {row['Response Guidance']}\n"
           f"Examples of Evidence: {row['Examples of Effective Evidence']}\n"
           f"Subject Tags: {row['Profile Subject Tags']}\n"
           f"Determine the organizational owner.",
    max_tokens=150)

    print("Received response from OpenAI:")
    print(response.choices[0].text.strip())
    return response.choices[0].text.strip()

# Process each row in the DataFrame
for index, row in df.iterrows():
    summary = summarize_policy(row)
    # Splitting the summary into parts; assuming the format "<category> <policy_text> <owner>"
    parts = summary.split('\n')
    if len(parts) >= 3:
        category = parts[0]
        policy_text = parts[1]
        owner = parts[2]

        # Prepare SQL insert statement
        insert_query = f"""
        INSERT INTO org_sec_policy (category, policy_text, owner, version)
        VALUES (%s, %s, %s, '1.0');
        """
        with engine.connect() as connection:
            connection.execute(insert_query, (category, policy_text, owner))
            # print(f"Inserted policy for {owner}")

print("Data insertion complete.")
