#!/usr/bin/env python
import os
import django
import sqlite3

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.project.settings')

# Change to backend directory and add to path
import sys
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

django.setup()

# Connect to SQLite database
db_path = os.path.join('backend', 'db.sqlite3')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Fixing NOT NULL constraints for comprehensive candidate fields...")

# Step 1: Create a temporary table with correct schema
print("Creating temporary table with correct schema...")
cursor.execute('''
CREATE TABLE IF NOT EXISTS "api_candidate_temp" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "email" varchar(254) NULL,
    "phone" varchar(20) NOT NULL DEFAULT '',
    "location" varchar(200) NOT NULL DEFAULT '',
    "resume_file" varchar(100) NULL,
    "resume_text" text NOT NULL DEFAULT '',
    "skills" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("skills") OR "skills" IS NULL)),
    "experience_years" integer unsigned NULL CHECK ("experience_years" >= 0),
    "experience_level" varchar(20) NOT NULL DEFAULT 'mid',
    "education" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("education") OR "education" IS NULL)),
    "certifications" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("certifications") OR "certifications" IS NULL)),
    "current_company" varchar(200) NOT NULL DEFAULT '',
    "current_position" varchar(200) NOT NULL DEFAULT '',
    "salary_expectation" decimal NULL,
    "availability" varchar(100) NOT NULL DEFAULT '',
    "status" varchar(20) NOT NULL DEFAULT 'new',
    "source" varchar(100) NOT NULL DEFAULT 'Direct Application',
    "rating" integer unsigned NULL CHECK ("rating" >= 0),
    "created_at" datetime NOT NULL,
    "updated_at" datetime NOT NULL,
    "achievements" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("achievements") OR "achievements" IS NULL)),
    "github_url" varchar(200) NOT NULL DEFAULT '',
    "languages" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("languages") OR "languages" IS NULL)),
    "linkedin_url" varchar(200) NOT NULL DEFAULT '',
    "notice_period" varchar(100) NOT NULL DEFAULT '',
    "portfolio_url" varchar(200) NOT NULL DEFAULT '',
    "preferred_location" varchar(200) NOT NULL DEFAULT '',
    "projects" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("projects") OR "projects" IS NULL)),
    "summary" text NOT NULL DEFAULT '',
    "visa_status" varchar(100) NOT NULL DEFAULT '',
    "work_experience" text NOT NULL DEFAULT '[]' CHECK ((JSON_VALID("work_experience") OR "work_experience" IS NULL))
);
''')

# Step 2: Copy all existing data to the temporary table with defaults for missing fields
print("Copying existing data with proper defaults...")
cursor.execute('''
INSERT INTO api_candidate_temp
SELECT
    id, first_name, last_name, email,
    COALESCE(phone, '') as phone,
    COALESCE(location, '') as location,
    resume_file,
    COALESCE(resume_text, '') as resume_text,
    COALESCE(skills, '[]') as skills,
    experience_years,
    COALESCE(experience_level, 'mid') as experience_level,
    COALESCE(education, '[]') as education,
    COALESCE(certifications, '[]') as certifications,
    COALESCE(current_company, '') as current_company,
    COALESCE(current_position, '') as current_position,
    salary_expectation,
    COALESCE(availability, '') as availability,
    COALESCE(status, 'new') as status,
    COALESCE(source, 'Direct Application') as source,
    rating,
    created_at,
    updated_at,
    COALESCE(achievements, '[]') as achievements,
    COALESCE(github_url, '') as github_url,
    COALESCE(languages, '[]') as languages,
    COALESCE(linkedin_url, '') as linkedin_url,
    COALESCE(notice_period, '') as notice_period,
    COALESCE(portfolio_url, '') as portfolio_url,
    COALESCE(preferred_location, '') as preferred_location,
    COALESCE(projects, '[]') as projects,
    COALESCE(summary, '') as summary,
    COALESCE(visa_status, '') as visa_status,
    COALESCE(work_experience, '[]') as work_experience
FROM api_candidate;
''')

# Step 3: Drop the original table
print("Dropping original table...")
cursor.execute('DROP TABLE api_candidate;')

# Step 4: Rename the temporary table
print("Renaming temporary table...")
cursor.execute('ALTER TABLE api_candidate_temp RENAME TO api_candidate;')

# Commit changes
conn.commit()

# Verify the fix
print("\n=== Verifying the fix ===")
cursor.execute("PRAGMA table_info(api_candidate);")
columns = cursor.fetchall()

null_fields = []
for column in columns:
    if column[1] in ['achievements', 'summary', 'github_url', 'linkedin_url', 'portfolio_url'] and column[3] == 1:
        null_fields.append(column[1])

if null_fields:
    print(f"WARNING: These fields are still NOT NULL: {null_fields}")
else:
    print("SUCCESS: All comprehensive fields now have proper defaults")

# Check data integrity
cursor.execute("SELECT COUNT(*) FROM api_candidate;")
count = cursor.fetchone()[0]
print(f"Records preserved: {count}")

cursor.execute("SELECT COUNT(*) FROM api_candidate WHERE achievements IS NULL OR achievements = '';")
null_achievements = cursor.fetchone()[0]
print(f"Records with null/empty achievements: {null_achievements}")

conn.close()
print("Schema fix completed!")