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

# Check candidate table schema
print("=== Candidate Table Schema ===")
cursor.execute("PRAGMA table_info(api_candidate);")
columns = cursor.fetchall()
for column in columns:
    print(f"Column: {column[1]}, Type: {column[2]}, Not Null: {column[3]}, Default: {column[4]}, Primary Key: {column[5]}")

print("\n=== Candidate Table Indexes ===")
cursor.execute("PRAGMA index_list(api_candidate);")
indexes = cursor.fetchall()
for index in indexes:
    print(f"Index: {index[1]}, Unique: {index[2]}")
    cursor.execute(f"PRAGMA index_info({index[1]});")
    index_info = cursor.fetchall()
    for info in index_info:
        print(f"  Column: {info[2]}")

print("\n=== Check for any constraints with 'email' ===")
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_candidate';")
create_sql = cursor.fetchone()
if create_sql:
    print(create_sql[0])

conn.close()