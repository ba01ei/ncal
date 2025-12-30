Publishes a Notion database with a date property to a calendar feed.

## Setup

1. Create a Notion integration at http://notion.so/profile/integrations
2. Go to the Notion database → click ••• from top right → Connections →
   Connect to, select the integration from the last step
3. Fork this val
4. Set `NOTION_API_TOKEN` in "Environment variables" from the sidebar
5. Update `datePropertyName`, `donePropertyName`, and `maxEventAgeInMonths` in the code if necessary

## Usage

Access your calendar feed by appending your Notion database ID and timezone to the URL:

```
https://<your-val-url>/<notion-database-id>?tz=<timezone>
```

For example:
```
https://example.web.val.run/abc123def456?tz=America/Los_Angeles
```

### Finding Your Database ID

You can find your database ID in the Notion URL when viewing the database:
`https://notion.so/<database-id>?v=...`

### Finding Your Timezone

The `tz` parameter uses **IANA timezone names** (also known as "tz database" names). 

Common examples:
- `America/New_York` (Eastern Time)
- `America/Chicago` (Central Time)
- `America/Denver` (Mountain Time)
- `America/Los_Angeles` (Pacific Time)
- `Europe/London`
- `Europe/Paris`
- `Asia/Tokyo`
- `Asia/Shanghai`
- `Australia/Sydney`

Find your timezone name in the full list: [List of tz database time zones (Wikipedia)](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

Look for the "TZ identifier" column in the table.

If you don't specify a timezone, it defaults to `UTC`.

### Subscribe to Your Calendar

Subscribe to this URL in any calendar app (Google Calendar, Apple Calendar, Outlook, etc.) to sync your Notion events.

## Features

### All-Day Events
Events in Notion that have only a date (no time) are displayed as all-day events in your calendar.

### Overdue Events Aggregation
The calendar automatically creates a daily reminder for overdue tasks. An event is considered **overdue** if:
- The `Done` checkbox is unchecked, AND
- Either the date is missing OR the end date is in the past

All overdue events are aggregated into a single all-day event that appears on **today's date** (based on your specified timezone) with:
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