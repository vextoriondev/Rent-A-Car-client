# RentFlow language glossary (F24 plain English, F25 Bangla)

Status 2026-10-16: **approved wording applied in the app.** English text lives in one place, `lib/copy/en.ts` (client) and `rentals/locale/en.json` (server). Change a word there and it changes everywhere. Bangla (`bn`) uses the same keys. **All Bangla in this file and in the catalogs is a first draft and needs a native-speaker review before it is shown to customers.**

Decisions (user, 2026-10-15): "Money you have to take / Money you have to give"; dates as `15 Oct 2026`; Bangla screens keep common English words people say aloud (রিপোর্ট, অ্যাডমিন, মেকানিক).

## Writing rules (every visible string)

1. Short sentences, about 12 words. One idea per sentence. (Check: average is about 4 words; the longest is 25.)
2. Everyday words. Active voice: "You paid ৳5,000", not "A payment of 5,000 was recorded".
3. Before a button, say what will happen. After it, say what happened.
4. One word for one thing, everywhere (table below).
5. No abbreviations, no capitals for shouting, no internal words.
6. Amounts always carry the ৳ sign and thousands commas: ৳65,000.
7. Dates always as `15 Oct 2026` (Bangla: `১৫ অক্টোবর ২০২৬`).
8. Never show: idempotency, journal, backend, API, Django, PostgreSQL, payload, snapshot, endpoint, JSON, raw ids such as `User #4`.

## Core words

| Old word | Say (English) | Bangla (draft) | Help tip (i) |
|---|---|---|---|
| Receivable | Money you have to take | আপনার নেওয়ার টাকা | – |
| Payable | Money you have to give | আপনার দেওয়ার টাকা | – |
| Outstanding (we owe) | Money to give (red) | দেওয়ার টাকা | – |
| Owed to us (they owe) | Money to take (amber) | নেওয়ার টাকা | – |
| Paid | Paid (green) | পরিশোধ হয়েছে | – |
| Obligation | Amount due | দেয় টাকা | – |
| Ledger | Account record | হিসাবের খাতা | The list of every money change. |
| Journal line | Account line (accountant only) | হিসাবের লাইন | – |
| Accrual margin | Profit | লাভ | – |
| Operator | You | আপনি | – |
| Cash movement | Cash in and out | নগদ আসা-যাওয়া | – |
| Offset | Taken off the owner's rent | মালিকের ভাড়া থেকে কাটা | – |
| Settlement | Month-end check / close | মাস শেষের হিসাব | – |
| Close / Reopen the month | Close the month / Open the month again | মাস বন্ধ করুন / আবার খুলুন | – |
| Opening / Closing balance | Balance at the start / at the end | শুরুর হিসাব / শেষের হিসাব | What was owed before the first day / after the last day. |
| Carry forward | Move the balance to next month | বাকি পরের মাসে নিন | – |
| Allocation / Split | Split the payment | পেমেন্ট ভাগ করুন | – |
| Payout | Payment to owner / driver | মালিক / চালককে পেমেন্ট | – |
| Advance | Money paid early | আগাম টাকা | – |
| Adjustment | Correction | সংশোধন | – |
| Reimbursement | Money paid back | ফেরত দেওয়া টাকা | – |
| Charge / Credit | Extra charge / Money off | অতিরিক্ত চার্জ / ছাড় | – |
| Fixed total | One fixed amount | একটি নির্দিষ্ট টাকা | One amount for the whole agreement, shared over its days. |
| Payment day | Payment day | পেমেন্টের দিন | The day each payment is due. |
| Invoice | Bill | বিল | – |
| Void | Cancel | বাতিল | – |
| Post / Posted | Record / Recorded | রেকর্ড / রেকর্ড হয়েছে | – |
| Reverse | Cancel and correct | বাতিল করে সংশোধন | – |
| Pending approval | Waiting for approval | অনুমোদনের অপেক্ষায় | Someone with the right role must approve first. |
| Overdue / Aging | Late / Days late | দেরি / কত দিন দেরি | – |
| Audit log | Change history | পরিবর্তনের ইতিহাস | – |
| Maintenance case | Repair job | মেরামতের কাজ | – |
| Off the road | Not available | চলাচলের বাইরে | – |
| Vehicle | Car | গাড়ি | – |
| Registration | Number plate | নম্বর প্লেট | – |
| Revise terms | Change the terms | শর্ত বদলান | – |
| Effective from | Starts on | যেদিন থেকে চালু | – |
| Clauses | Extra conditions | অতিরিক্ত শর্ত | – |
| Responsible party | Who pays in the end | শেষ পর্যন্ত কে দেবে | – |
| Paid by | Paid by / Who pays first | কে আগে দিয়েছে | – |
| Notice / Notification | Message | বার্তা | – |

## Page names

Home (হোম) · Agreements (চুক্তি) · Cars (গাড়ি) · Repairs (মেরামত) · Customers (গ্রাহক) · Owners (মালিক) · Drivers (চালক) · Expenses (খরচ) · Bills to customers (গ্রাহকের বিল) · Money to give owners (মালিকদের দেওয়ার টাকা) · Driver pay (চালকের বেতন) · Month-end close (মাস শেষের হিসাব) · Cash record (নগদের খাতা) · Reports (রিপোর্ট) · Messages sent (পাঠানো বার্তা) · Files (ফাইল) · Change history (পরিবর্তনের ইতিহাস) · Settings (সেটিংস).

## Roles

Admin (অ্যাডমিন) · Accountant (হিসাবরক্ষক) · Operations (অপারেশন) · View only (শুধু দেখা) · Mechanic (মেকানিক).

## How the words are kept consistent

* `lib/copy/en.ts` — all screen text, flat keys (`billing.row.total`), `{name}` for values, `key.one` / `key.other` for counts.
* `lib/copy/labels.ts` — shows the stored English values (entry types, parties, statuses, categories, accounts, audit actions) in plain words. The stored value never changes.
* `rentals/locale/en.json` — all server text (errors, report headings, month-end items, message titles), keyed by stable codes.
* A reading check (`readcheck.py` idea): average sentence length, sentences over 22 words, and a list of banned words. Run it after any wording change.
