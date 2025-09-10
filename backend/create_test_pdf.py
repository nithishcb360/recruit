#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_test_resume():
    filename = "test_resume.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Add text to the PDF
    y_position = 750
    c.drawString(100, y_position, "John Doe")
    y_position -= 30
    c.drawString(100, y_position, "john.doe@example.com")
    y_position -= 20
    c.drawString(100, y_position, "(555) 123-4567")
    y_position -= 40
    
    c.drawString(100, y_position, "EXPERIENCE")
    y_position -= 20
    c.drawString(100, y_position, "5 years of experience in software development")
    y_position -= 40
    
    c.drawString(100, y_position, "SKILLS")
    y_position -= 20
    c.drawString(100, y_position, "Python, JavaScript, React, Django, Node.js")
    y_position -= 40
    
    c.drawString(100, y_position, "EDUCATION")
    y_position -= 20
    c.drawString(100, y_position, "Bachelor's degree in Computer Science")
    y_position -= 20
    c.drawString(100, y_position, "University of Technology")
    
    c.save()
    print(f"Test resume created: {filename}")

if __name__ == "__main__":
    try:
        create_test_resume()
    except ImportError:
        print("reportlab not installed. Install with: pip install reportlab")