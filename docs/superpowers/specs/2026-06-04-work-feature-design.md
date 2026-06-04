# Work Feature Design

Date: 2026-06-04

## Summary

Add a separate `Work` view for Mani's freelance and learning workflow. Work data is owned by Mani, but because the app uses a unified login, Harti can view and edit it too. Work must not be split by active persona like the personal development dashboard.

The accepted visual direction is a minimalist, courses-first Work view:

1. Courses span the first full-width surface.
2. Clients / leads appear below courses.
3. Projects appear beside or below clients / leads depending on screen size.
4. Deadlines appear inside course, client, and project rows as metadata and filters rather than as the dominant first surface.

The existing lead tracker should migrate out of the personal dashboard and into this new Work view.

## Product Shape

`Work` is a separate route. It should not be another section appended to the current home dashboard.

The page order is:

1. Header with Work title, ownership note, and primary actions.
2. Full-width Courses section.
3. Clients / Leads list.
4. Projects list.

Primary action:

- `Paste course plan`

Secondary actions:

- `New client`
- `New project`

Navigation changes:

- Add a `Work` nav item.
- Remove the existing leads block from the personal dashboard.
- Keep the personal development dashboard unchanged except for removing the lead block.

## Data Ownership

Work data is shared under the current unified login and should not be scoped to the active persona. Mani and Harti can both view and edit the same Work data.

This is different from personal development data, which remains persona-local.

## Data Model

### Course

- `id`
- `title`
- `url`
- `goal`
- `deadline`
- `source`
- `status`
- `createdAt`
- `updatedAt`

### CourseChapter

- `id`
- `courseId`
- `title`
- `deadline`
- `estimate`
- `priority`
- `order`

### CourseMilestone

- `id`
- `chapterId`
- `title`
- `deadline`
- `estimate`
- `link`
- `notes`
- `completed`
- `order`

Milestone optional fields are limited to:

- `deadline`
- `estimate`
- `link`
- `notes`

### WorkContact

This replaces the current narrow `Lead` model.

- `id`
- `name`
- `status`
- `phone`
- `email`
- `notes`
- `source`
- `nextStep`
- `createdAt`
- `updatedAt`

Suggested `status` values:

- `lead`
- `prospect`
- `client`
- `lost`
- `archived`

### WorkProject

- `id`
- `contactId`
- `title`
- `status`
- `deadline`
- `notes`
- `progress`
- `createdAt`
- `updatedAt`

Every project must have exactly one `contactId`. A project cannot be created without selecting a client or lead.

Courses are independent and must not attach to clients or projects.

## Course Import Parser

The app will not call AI directly in v1. The user will use an external chatbot to generate a strict Markdown-like course plan, paste it into Work, and the app will parse it into editable checklists.

Supported format:

```md
Course: Advanced Next.js
URL: https://course.com
Goal: Ship better SaaS work
Deadline: 2026-07-30
Source: Udemy
Status: active

## Chapter 1: Routing
Deadline: 2026-06-12
Estimate: 3h
Priority: high

### Milestone: Watch routing lessons
Deadline: 2026-06-10
Estimate: 45m
Link: https://lesson.com
Notes: Focus on behavior changes.
```

Parser behavior:

- `Course`, `URL`, `Goal`, `Deadline`, `Source`, and `Status` become course fields.
- `## Chapter...` starts a chapter.
- `### Milestone...` starts a milestone.
- Chapter fields support `Deadline`, `Estimate`, and `Priority`.
- Milestone fields only support `Deadline`, `Estimate`, `Link`, and `Notes`.
- Parsed results open in a review/edit step before saving.
- Blank optional fields are allowed.
- Missing required structure shows precise parser errors instead of silently guessing.
- Unknown optional fields appear as warnings in preview and are not saved.

Required structure:

- A course must include `Course:`.
- A milestone must belong to a chapter.
- A chapter must belong to a course.

## External AI Prompt Button

The parser area includes a `Copy AI prompt` button. Clicking it copies a prompt the user can paste into an external chatbot.

Prompt:

```text
Read this course page and convert it into the exact format below.

Course URL:
<PASTE_COURSE_URL_HERE>

Rules:
- Return only the structured course plan.
- Do not add explanations.
- Use the exact field names shown.
- Use ISO dates as YYYY-MM-DD when dates are known.
- If a deadline is unknown, leave it blank after the colon.
- Break the course into chapters.
- Break each chapter into milestones.
- Each milestone may only include Deadline, Estimate, Link, and Notes.

Format:
Course:
URL:
Goal:
Deadline:
Source:
Status: active

## Chapter 1: <chapter title>
Deadline:
Estimate:
Priority:

### Milestone: <milestone title>
Deadline:
Estimate:
Link:
Notes:
```

Flow:

1. User clicks `Copy AI prompt`.
2. User pastes the prompt into an external chatbot with a course URL.
3. External chatbot returns strict formatted text.
4. User pastes the formatted text into the Work parser.
5. App parses and previews the result.
6. User edits the preview when corrections are needed.
7. User saves the course checklist.

## UI Direction

Use the approved courses-first minimalist visual direction from the live companion.

Visual rules:

- Warm monochrome canvas.
- Flat white or warm-bone surfaces.
- `1px` light borders.
- Minimal or no shadows.
- Crisp cards with modest radius.
- Muted pastel tags only for semantic status.
- No gradients, neon effects, or large colored panels.
- Strong typographic hierarchy.

Layout:

- Header: Work title, ownership note, actions.
- Courses section spans the full viewport width available to the app content area.
- Courses section includes active course progress, strict parser paste area, `Copy AI prompt`, parsed preview, and milestone checklist rows.
- Clients / Leads and Projects sit below courses as simple lists.
- On desktop, Clients / Leads and Projects can sit side by side.
- On mobile, all sections stack in this order: Courses, Clients / Leads, Projects.

## Course UI

Course cards should show:

- Title
- URL / open link
- Goal
- Deadline
- Source
- Status
- Progress
- Chapters
- Milestone completion state

Milestone rows should show:

- Checkbox
- Title
- Deadline
- Estimate
- Direct lesson link
- Notes

Milestones remain editable after import.

## Clients / Leads UI

The current lead tracker should migrate into Work and become `Clients / Leads`.

Rows should show:

- Name
- Status
- Phone
- Email
- Source
- Next step
- Notes affordance
- Related project count

Supported actions:

- Create
- Edit
- Archive
- Change status

## Projects UI

Projects are a separate list below Courses, but each project must be attached to exactly one WorkContact.

Rows should show:

- Title
- Attached client / lead
- Status
- Deadline
- Progress
- Notes

Supported actions:

- Create only after selecting a client / lead.
- Edit.
- Archive.
- Change status.

## Storage Architecture

Create a shared Work data layer that is not persona-scoped.

V1 storage:

- Add shared Work Dexie tables.
- Add a Work store for courses, chapters, milestones, contacts, and projects.
- Keep personal development stores unchanged.
- Migrate existing lead records into the Work contacts shape.

Work persistence should not use `SoloLevelingDB-mani` or `SoloLevelingDB-harti` as the primary identity if that would split Work by persona. Use a shared Work database/table strategy instead.

Cloud sync is out of scope for v1. If cloud sync is added in a later spec, it must preserve the shared Work ownership model and not split Work by active persona.

## Error Handling

Parser errors:

- Missing `Course:`.
- Chapter appears before course.
- Milestone appears before chapter.
- Malformed heading.
- Unsupported milestone field.
- Invalid URL syntax for `URL` or `Link`.

Project errors:

- Cannot create project without `contactId`.
- Contacts with projects can be archived but not hard-deleted in v1.

Link behavior:

- Course URLs and milestone links are stored as plain URLs.
- Links open directly when clicked.

## Testing

Parser tests:

- Valid single-course input.
- Multiple chapters.
- Multiple milestones.
- Blank optional fields.
- Missing `Course:`.
- Chapter before course.
- Milestone before chapter.
- Unsupported milestone field warning.
- Invalid URL warning.

Store tests:

- Create, update, delete course.
- Create, update, delete chapter.
- Create, update, delete milestone.
- Toggle milestone completed state.
- Create, update, delete WorkContact.
- Create, update, delete WorkProject.
- Reject project creation without `contactId`.

UI tests:

- Work route renders.
- Courses section appears before clients / leads and projects.
- Parser prompt button copies the prompt.
- Parser preview appears before save.
- Course save creates editable checklist.
- Existing leads block no longer appears on personal dashboard.

Regression tests:

- Personal dashboard still loads.
- Persona switching does not split Work data.
- Existing personal stores remain persona-local.
