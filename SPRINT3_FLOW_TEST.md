# Sprint 3 Flow Test (Internal Simulation)

Purpose: Validate that the candidate and HR flows work together end to end and that UI details clearly reflect AI processing outputs.

## A. Candidate Flow (Public)

1. Open public jobs page.
   - Expected: Open positions listed, search and filters work.

2. Open a job and apply with PDF, DOCX, or TXT resume.
   - Expected: Upload accepted, consent required, submission success message shown.
   - Expected: Tracking token displayed for the candidate.

3. Request tracking code with the same email.
   - Expected: Generic success message (even if email not found).

4. Verify code.
   - Expected: Application list shown with status, applied date, retention date.
   - Expected: If status is processed, a Download CV button appears.

5. Download standardized CV from public tracking.
   - Expected: PDF downloads successfully using token.

## B. HR Flow (Admin)

1. Open HR candidate list and pick the new candidate.
   - Expected: Candidate detail loads with status badge and score ring.

2. Click "Process CV".
   - Expected: Status changes to processing and shows spinner.
   - Expected: Page auto-refreshes (polls) until status is processed or error.

3. After processing completes:
   - Expected: Score ring updates to the AI score.
   - Expected: Standardized CV preview appears.
   - Expected: Parsed CV Details section shows skills, experience, education, and other extracted info.
   - Expected: Score explanation panel shows bars, matched/missing skills, and experience match.

4. Change CV template.
   - Expected: Template selection saved.
   - Expected: Reprocess triggers if status was processed.

5. Download standardized CV (HR).
   - Expected: PDF download works.

6. Error handling test (optional):
   - Apply with an empty or unreadable resume.
   - Expected: Status becomes error and HR notes show a clear message.

## Pass Criteria

- Status, score, and parsed data are consistent across candidate and HR views.
- Public tracking download works only after processing.
- HR view reflects AI updates without manual refresh.
