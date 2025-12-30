Publishes a Notion database with a date property to a calendar feed.

## Demo

Try the live demo calendar feed:

```
https://ncal.val.run/2d92c190bff080658109ec63757a2e53?tz=America/Los_Angeles
```

## Setup

### 1. Create Your Notion Database

Your database needs these properties:

- **Name** (title) - The event title
- **Date** (date) - The event date/time
- **Done** (checkbox) - Whether the task is complete

You can duplicate this example database to get started:
👉 [Example Todo Database](https://baolei.notion.site/demotodo?v=2d92c190bff08078a449000cc9ebf910&pvs=73)

### 2. Create a Notion Integration

1. Go to [Notion Integrations](http://notion.so/profile/integrations)
2. Click "New integration" and give it a name
3. Copy the "Internal Integration Secret" (this is your API token)

### 3. Connect Your Database

1. Open your Notion database
2. Click ••• from the top right → Connections → Connect to
3. Select the integration you created

### 4. Deploy the Val

1. Fork this val
2. Set `NOTION_API_TOKEN` in "Environment variables" from the sidebar
3. Update `datePropertyName`, `donePropertyName`, and `maxEventAgeInMonths` in the code if your property names differ

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

- A **Name** title property for event titles
- A **Date** date property (configurable via `datePropertyName`)
- A **Done** checkbox property (configurable via `donePropertyName`)

👉 [Duplicate this example database](https://baolei.notion.site/demotodo?v=2d92c190bff08078a449000cc9ebf910&pvs=73) to get started quickly.
