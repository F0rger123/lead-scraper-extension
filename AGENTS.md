# AI guide: lead-scraper-extension

**For AI assistants (Claude, ChatGPT, Codex, Cursor, Gemini).** Someone gave you a link to this repository. Use this page to explain it, set it up, or help them use it. Talk in plain English; the person may not be technical.

## What this is

A Chrome extension that adds an "Add Lead" button to house listings on PropWire, Zillow, Homes.com and Trulia, saves the details and exports them to a spreadsheet.

**Usually used by:** A real-estate investor or agent.

## Ask first

Ask these together in one short message, then repeat back what you heard in a line or two. Skip anything they already told you.

- Do you use Chrome?
- Which listing sites do you use?

## Set it up

Do one step at a time. Check each one worked before moving on.

| # | Do this | It worked if |
|---|---|---|
| 1 | Open `chrome://extensions`, turn on Developer mode | Toggle is on |
| 2 | Click Load unpacked and pick this folder | The extension icon appears |

## Use it

- Open a listing, click + Add Lead, then use the extension icon to export to CSV.

## How it works, in plain words

1. It copies the address, owner and price from the page and stores the lead in your browser.

## Never

- Never ask for, paste or print passwords, API keys or tokens. Tell the person where to put them (their own `.env` file or the hosting dashboard) and let them do it.
- Never deploy, push to `main`, change a live database or spend money without the person saying yes to that exact step.
- Use it within each website's terms of service and privacy laws.

## When you're done

Tell the person, in a few lines: what is set up and checked, what isn't yet, and two or three things they can ask you next.
