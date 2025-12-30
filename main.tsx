import { Client } from "https://esm.sh/@notionhq/client";

export default async function server(request: Request): Promise<Response> {
  try {
    // Ensure Notion API key is set
    const notionApiKey = Deno.env.get("NOTION_API_TOKEN");
    const databaseId = Deno.env.get("NOTION_EVENTS_DATABASE_ID");
    const datePropertyName = "Date";
    const maxEventAgeInMonths = 18;

    if (!notionApiKey || !databaseId) {
      return new Response("Missing Notion API credentials", { status: 500 });
    }

    const notion = new Client({ auth: notionApiKey });

    // Calculate the date n months ago
    const someMonthsAgo = new Date();
    someMonthsAgo.setMonth(someMonthsAgo.getMonth() - maxEventAgeInMonths);

    // Fetch pages from Notion database
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: datePropertyName, // Adjust to match your actual date property name
            date: {
              is_not_empty: true,
            },
          },
          {
            property: datePropertyName,
            date: {
              on_or_after: someMonthsAgo.toISOString().split("T")[0],
            },
          },
        ],
      },
    });

    // Transform Notion pages to iCal format
    const events = response.results.map(page => {
      // Adjust these property names to match your specific Notion database
      const dateProperty = page.properties[datePropertyName];

      // Handle Notion's date object which can have start and end times
      const start = dateProperty.date?.start ? new Date(dateProperty.date.start) : null;
      const end = dateProperty.date?.end ? new Date(dateProperty.date.end) : start;

      // Get page title (assuming first text property)
      const title = page.properties.Name?.title?.[0]?.plain_text || "Untitled Event";

      return {
        uid: page.id,
        title,
        start: start?.toISOString(),
        end: end?.toISOString(),
        description: page.public_url || page.url || "",
      };
    }).filter(event => event.start); // Remove events without start time

    // Generate iCal feed
    const icalFeed = generateICalFeed(events);

    // Return iCal feed as HTTP response
    return new Response(icalFeed, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new Response(`Error generating calendar feed: ${error.message}`, { status: 500 });
  }
}

function generateICalFeed(events) {
  const icalLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Notion Calendar Export//EN",
  ];

  events.forEach(event => {
    icalLines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `SUMMARY:${event.title}`,
      `DTSTART:${formatICalDate(event.start)}`,
      `DTEND:${formatICalDate(event.end)}`,
      `DESCRIPTION:${event.description}`,
      "END:VEVENT",
    );
  });

  icalLines.push("END:VCALENDAR");

  return icalLines.join("\r\n");
}

function formatICalDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}