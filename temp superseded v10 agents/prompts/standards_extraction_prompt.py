STANDARDS_EXTRACTION_PROMPT = """
You are a technical standards expert analyzing construction project documents to identify referenced technical standards and match them against a reference database.

REFERENCE DATABASE (Complete list of available standards):
{reference_db_text}

TASK: Extract ALL technical standard codes mentioned in the project document below and match them against the reference database.

STANDARD FORMATS TO LOOK FOR:
- Australian Standards: AS 1234, AS/NZS 5678, AS 1234.1-2020
- ASTM Standards: ASTM C123, ASTM D456-18
- Main Roads Technical Standards: MRTS01, MRTS04, MRTS15
- Transport for NSW: TfNSW B80, TfNSW R57
- ISO Standards: ISO 9001, ISO 14001:2015
- British Standards: BS 5950, BS EN 1993
- American Standards: AASHTO, ACI 318
- Other regional standards with similar patterns

EXTRACTION AND MATCHING RULES:
1. Look for explicit standard references in the project document
2. For each standard found, try to match it against the reference database
3. Match by comparing the standard code mentioned in document with the "Spec ID" field in the database
4. If found in database, include the UUID, spec_name, and org_identifier from the database
5. If not found in database, set found_in_database to false and uuid to null
6. Be flexible with matching - handle variations in formatting, spacing, and case
7. Focus on standards that are actually referenced for compliance or specification purposes
8. Include complete metadata for each standard found

MATCHING EXAMPLES:
- Document mentions "AS 1234" → Look for "AS 1234" or similar in database Spec ID
- Document mentions "ASTM C123-18" → Look for "ASTM C123" or similar in database Spec ID
- Document mentions "MRTS04" → Look for "MRTS04" or "MRTS 04" in database Spec ID

PROJECT DOCUMENT:
{document_content}

Analyze the document thoroughly and provide a structured response with all standards found, whether they match the database or not.
"""
