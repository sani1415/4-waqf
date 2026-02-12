# Student Import Template

## Format

Use the CSV file `students-import-template-v2.csv` (or `students-import-template.csv`) as a template. Open it in Excel or Google Sheets, fill in your student data, and save as CSV.

### Columns (in order)

| Column          | Required | Example / Notes                                      |
|-----------------|----------|------------------------------------------------------|
| Name            | Yes      | Full name of student                                 |
| Date of Birth   | Yes      | YYYY-MM-DD (e.g. 2010-05-15)                        |
| Phone           | No       | Student phone number                                 |
| Email           | No       | Student email                                        |
| Parent Name     | Yes      | Guardian full name                                   |
| Parent Phone    | Yes      | Guardian phone number                                |
| Parent Email    | No       | Guardian email                                       |
| Father's Work   | No       | Father's occupation (e.g. Business, Teacher)         |
| District        | No       | District (জেলা)                                     |
| Upazila         | No       | Upazila / Sub-district (উপজেলা)                     |
| Address         | No       | Detail address (Village, Road, House no, etc.)       |
| Admission Date  | Yes      | YYYY-MM-DD (e.g. 2024-09-01). Used for "Year" calc  |
| PIN             | No       | 4–6 digits. Default 1234 if empty                    |

### Notes

- **Student ID** (`waqf-001`, `waqf-002`, ...) is auto-generated. Do not include it.
- **Year** (First Year, Second Year, etc.) is calculated from Admission Date.
- Keep the header row. Column names can vary slightly (e.g. "Date of Birth" or "DOB").
- Save the file as **CSV** (Comma-Separated Values) before importing.

### How to import

1. Go to Teacher Dashboard → **Students** section
2. Click **Import from CSV**
3. Select your filled CSV file
4. Students will be added. A message will show how many were imported and any errors.
