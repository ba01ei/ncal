import { Client } from "npm:@notionhq/client@2.2.15";
import type {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "npm:@notionhq/client@2.2.15/build/src/api-endpoints";

interface CalendarEvent {
  uid: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isDone: boolean;
  description: string;
}

// Helper to fetch all pages from a Notion database query (handles pagination)
async function queryAllPages(
  notion: Client,
  params: QueryDatabaseParameters
): Promise<QueryDatabaseResponse["results"]> {
  const allResults: QueryDatabaseResponse["results"] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.databases.query({
      ...params,
      start_cursor: cursor,
      page_size: 100, // Maximum allowed by Notion API
    });
    allResults.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return allResults;
}

export default async function server(request: Request): Promise<Response> {
  try {
    // Ensure Notion API key is set
    const notionApiKey = Deno.env.get("NOTION_API_TOKEN");

    // Get database ID from URL path: https://host/{notionDatabaseId}?tz=America/Los_Angeles
    const url = new URL(request.url);
    const databaseId = url.pathname.slice(1); // Remove leading "/"
    const timezone = url.searchParams.get("tz") || "UTC";

    const datePropertyName = "Date";
    const donePropertyName = "Done";
    const maxEventAgeInMonths = 12;

    if (!notionApiKey) {
      return new Response("Missing NOTION_API_TOKEN environment variable", {
        status: 500,
      });
    }

    if (!databaseId) {
      return new Response(
        "Missing database ID in URL path. Use: https://host/{notionDatabaseId}?tz=America/Los_Angeles",
        { status: 400 }
      );
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return new Response(
        `Invalid timezone: "${timezone}". Use IANA timezone names like "America/Los_Angeles". See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`,
        { status: 400 }
      );
    }

    const notion = new Client({ auth: notionApiKey });

    // Calculate the date n months ago
    const someMonthsAgo = new Date();
    someMonthsAgo.setMonth(someMonthsAgo.getMonth() - maxEventAgeInMonths);

    // Fetch pages from Notion database with pagination
    // Query 1: Events with dates within the last N months, sorted by date descending
    const datedResults = await queryAllPages(notion, {
      database_id: databaseId,
      filter: {
        and: [
          {
            property: datePropertyName,
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
      sorts: [
        {
          property: datePropertyName,
          direction: "descending",
        },
      ],
    });

    // Query 2: Events without dates that are not done (for overdue aggregate)
    // Sorted by last_edited_time descending
    const undatedResults = await queryAllPages(notion, {
      database_id: databaseId,
      filter: {
        and: [
          {
            property: datePropertyName,
            date: {
              is_empty: true,
            },
          },
          {
            property: donePropertyName,
            checkbox: {
              equals: false,
            },
          },
        ],
      },
      sorts: [
        {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      ],
    });

    // Combine results
    const allPages = [...datedResults, ...undatedResults];

    // Get today's date string in the user's timezone
    const now = new Date();
    const todayStr = getDateInTimezone(now, timezone);

    // Get tomorrow's date string in the user's timezone
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = getDateInTimezone(tomorrow, timezone);

    // Track overdue events for aggregation
    const overdueEvents: { title: string; description: string }[] = [];

    // Transform Notion pages to iCal format
    const events = allPages
      .map((page) => {
        // Skip partial responses that don't have properties
        if (!("properties" in page)) return null;

        // deno-lint-ignore no-explicit-any
        const props = page.properties as any;
        const dateProperty = props[datePropertyName];
        const startStr = dateProperty?.date?.start;
        const endStr = dateProperty?.date?.end;

        // Get Done status
        const doneProperty = props[donePropertyName];
        const isDone = doneProperty?.checkbox === true;

        // Get page title
        const title = props.Name?.title?.[0]?.plain_text || "Untitled Event";

        // Get URL for description
        const pageUrl = "url" in page ? String(page.url) : "";

        // Check if this is an overdue event:
        // - Not done AND (no date OR end date is in the past)
        if (!isDone) {
          const effectiveEndStr = endStr || startStr;
          const hasNoDate = !startStr;
          const isInPast =
            effectiveEndStr && effectiveEndStr.split("T")[0] < todayStr;

          if (hasNoDate || isInPast) {
            overdueEvents.push({ title, description: pageUrl });
          }
        }

        // Skip events without start date for regular calendar display
        if (!startStr) return null;

        // Check if date has time component (contains 'T')
        // Notion returns "2025-01-01" for date-only and "2025-01-01T10:00:00.000Z" for datetime
        const isAllDay = !startStr.includes("T");

        let start: string;
        let end: string;

        if (isAllDay) {
          // All-day event: use date-only format
          // For iCal VALUE=DATE format, end date is exclusive
          // So "Jan 1" becomes start=Jan 1, end=Jan 2
          // And "Jan 1 - Jan 3" becomes start=Jan 1, end=Jan 4
          start = startStr; // "2025-01-01"
          const endDate = endStr ? new Date(endStr) : new Date(startStr);
          endDate.setDate(endDate.getDate() + 1); // Add one day (exclusive end)
          end = endDate.toISOString().split("T")[0]; // "2025-01-02" or "2025-01-04"
        } else {
          // Timed event: use full datetime
          start = new Date(startStr).toISOString();
          end = endStr
            ? new Date(endStr).toISOString()
            : new Date(startStr).toISOString();
        }

        return {
          uid: page.id,
          title,
          start,
          end,
          isAllDay,
          isDone,
          description: pageUrl,
        };
      })
      .filter((event): event is CalendarEvent => event !== null);

    // Create aggregate overdue event if there are any overdue items
    if (overdueEvents.length > 0) {
      // Aggregate title: "event 1 • event 2 • event 3"
      const aggregateTitle = overdueEvents.map((e) => e.title).join(" • ");

      // Aggregate description: database URL + "event 1\ndescription 1\n\nevent 2\ndescription 2"
      const databaseUrl = `https://notion.so/${databaseId}`;
      const eventDescriptions = overdueEvents
        .map((e) => `${e.title}\n${e.description}`)
        .join("\n\n");
      const aggregateDescription = `${databaseUrl}\n\n${eventDescriptions}`;

      // Create all-day event for today (in user's timezone)
      events.push({
        uid: `overdue-aggregate-${todayStr}`,
        title: aggregateTitle,
        start: todayStr,
        end: tomorrowStr,
        isAllDay: true,
        isDone: false,
        description: aggregateDescription,
      });
    }

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
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error generating calendar feed: ${message}`, {
      status: 500,
    });
  }
}

function generateICalFeed(events: CalendarEvent[]) {
  const icalLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Notion Calendar Export//EN",
  ];

  events.forEach((event) => {
    // Prepend checkmark emoji if the event is done
    const summary = event.isDone ? `✅ ${event.title}` : event.title;

    if (event.isAllDay) {
      // All-day event: use VALUE=DATE format (no time component)
      // This tells calendar apps to display it as an all-day event in user's timezone
      icalLines.push(
        "BEGIN:VEVENT",
        `UID:${event.uid}`,
        `SUMMARY:${summary}`,
        `DTSTART;VALUE=DATE:${formatICalDateOnly(event.start)}`,
        `DTEND;VALUE=DATE:${formatICalDateOnly(event.end)}`,
        `DESCRIPTION:${event.description}`,
        "END:VEVENT"
      );
    } else {
      // Timed event: use full datetime with Z suffix (UTC)
      icalLines.push(
        "BEGIN:VEVENT",
        `UID:${event.uid}`,
        `SUMMARY:${summary}`,
        `DTSTART:${formatICalDateTime(event.start)}`,
        `DTEND:${formatICalDateTime(event.end)}`,
        `DESCRIPTION:${event.description}`,
        "END:VEVENT"
      );
    }
  });

  icalLines.push("END:VCALENDAR");

  return icalLines.join("\r\n");
}

// Format for all-day events: YYYYMMDD (no time)
function formatICalDateOnly(dateString: string): string {
  if (!dateString) return "";
  // dateString is already "YYYY-MM-DD" format from our processing
  return dateString.replace(/-/g, "");
}

// Format for timed events: YYYYMMDDTHHMMSSZ
function formatICalDateTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Get date string (YYYY-MM-DD) in a specific timezone
function getDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Returns "YYYY-MM-DD" format
}
