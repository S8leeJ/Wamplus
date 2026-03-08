export const dynamic = 'force-dynamic';

const FAKE_NOTIFICATIONS = [
  {
    id: "1",
    title: "New unit available at 26 West",
    message: "A 2B/2B unit on floor 5 just became available.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    title: "Price drop at Rise at West Campus",
    message: "Floor plan 3B/2B reduced by $150/month.",
    time: "1 day ago",
    read: false,
  },
  {
    id: "3",
    title: "Compare saved",
    message: "Your comparison of 26 West and The Standard has been saved.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "4",
    title: "New apartment added",
    message: "Moontower has been added to WAMP+. Check it out!",
    time: "3 days ago",
    read: true,
  },
  {
    id: "5",
    title: "Reminder: Tour scheduled",
    message: "You have a tour at Union on 24th tomorrow at 2pm.",
    time: "4 days ago",
    read: true,
  },
];

export default function NotificationsPage() {
  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem-3rem)] flex-1 flex-col p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary-800">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Updates and reminders for your apartment search.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <ul className="space-y-3">
          {FAKE_NOTIFICATIONS.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border transition-shadow ${
                n.read
                  ? "border-primary-200 bg-white"
                  : "border-primary-200 bg-white shadow-sm ring-1 ring-primary-200"
              }`}
            >
              <div className="flex gap-4 p-5">
                <div className="flex w-6 shrink-0 items-start justify-center pt-0.5">
                  {!n.read && (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-primary-600"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      n.read ? "text-zinc-600" : "text-primary-900"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">{n.message}</p>
                  <p className="mt-2 text-xs text-zinc-400">{n.time}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
