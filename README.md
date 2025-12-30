Publishes a Notion database with a date property to a calendar feed.

## Setup

1. Create a Notion integration at http://notion.so/profile/integrations
2. Go to the Notion database → click ••• from top right → Connections →
   Connect to, select the integration from the last step
3. Fork this val
4. Set `NOTION_API_TOKEN` in "Environment variables" from the sidebar
5. Update `datePropertyName` and `maxEventAgeInMonths` in the code if necessary

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