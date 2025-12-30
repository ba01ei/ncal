Publishes a Notion database with a date property to a calendar feed.

## Setup

1. Create a Notion integration at http://notion.so/profile/integrations
2. Go to the Notion database → click ••• from top right → Connections →
   Connect to, select the integration from the last step
3. Fork this val
4. Set `NOTION_API_TOKEN` in "Environment variables" from the sidebar
5. Update `datePropertyName`, `donePropertyName`, and `maxEventAgeInMonths` in the code if necessary

## Usage

Access your calendar feed by appending your Notion database ID to the URL:

```
https://<your-val-url>/<notion-database-id>
```

For example:
```
https://example.web.val.run/abc123def456
```

You can find your database ID in the Notion URL when viewing the database:
`https://notion.so/<database-id>?v=...`

Subscribe to this URL in any calendar app (Google Calendar, Apple Calendar, Outlook, etc.) to sync your Notion events.

## Features

### All-Day Events
Events in Notion that have only a date (no time) are displayed as all-day events in your calendar.

### Overdue Events Aggregation
The calendar automatically creates a daily reminder for overdue tasks. An event is considered **overdue** if:
- The `Done` checkbox is unchecked, AND
- Either the date is missing OR the end date is in the past

All overdue events are aggregated into a single all-day event that appears on **today's date** with:
- **Title**: All overdue event titles joined with " • " (e.g., "Task 1 • Task 2 • Task 3")
- **Description**: Each event's title and Notion URL, formatted as:
  ```
  Task 1
  https://notion.so/...

  Task 2
  https://notion.so/...
  ```

This gives you a daily overview of incomplete tasks that need attention.

## Database Requirements

Your Notion database should have:
- A **Date** property (configurable via `datePropertyName`)
- A **Done** checkbox property (configurable via `donePropertyName`)
- A **Name** title property for event titles