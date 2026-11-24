import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  Laptop,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  categoryOptions,
  formatShortDate,
  navItems,
  newId,
  readPortalData,
  roleAccess,
  savePortalData,
  SESSION_KEY,
  type PortalData,
  type Profile,
  type RecordItem,
  type Role,
  ticketStatuses,
  requestStatuses,
} from "@/lib/portal-data";

const routeMeta: Record<string, { title: string; eyebrow: string; description: string }> = {
  "/": { title: "Good morning", eyebrow: "Workspace overview", description: "Your service desk, at a glance." },
  "/tickets": { title: "Support tickets", eyebrow: "Service desk", description: "Track issues from first response through resolution." },
  "/requests": { title: "Service requests", eyebrow: "Work queue", description: "Review and follow service requests from your team." },
  "/services": { title: "Service catalog", eyebrow: "Available services", description: "Find the right support for your organization." },
  "/assets": { title: "IT assets", eyebrow: "Inventory", description: "Keep devices, licenses, and ownership in view." },
  "/clients": { title: "Client directory", eyebrow: "Organizations", description: "Manage client contacts and service relationships." },
  "/knowledge": { title: "Knowledge base", eyebrow: "Support library", description: "Practical answers for common IT questions." },
  "/reports": { title: "Reports & analytics", eyebrow: "Performance", description: "Understand service activity and response trends." },
};

const iconByPath = {
  "/": LayoutDashboard,
  "/tickets": Ticket,
  "/requests": ClipboardList,
  "/services": Boxes,
  "/assets": Laptop,
  "/clients": Building2,
  "/knowledge": BookOpen,
  "/reports": ChartNoAxesCombined,
};

type DataSection = "tickets" | "requests" | "services" | "assets" | "clients" | "articles";
type CreateKind = "ticket" | "request";

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (["resolved", "closed", "completed", "active", "available", "approved", "published"].includes(value)) return "bg-success-soft text-success";
  if (["critical", "rejected", "under maintenance"].includes(value)) return "bg-danger-soft text-destructive";
  if (["in progress", "under review", "on hold", "onboarding"].includes(value)) return "bg-warning-soft text-warning";
  return "bg-info-soft text-info";
}

function StatusPill({ status }: { status: string }) {
  return <span className={`portal-status ${statusTone(status)}`}>{status}</span>;
}

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "IT";
}

export function PortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [data, setData] = useState<PortalData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [presetTitle, setPresetTitle] = useState("");
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  useEffect(() => {
    const stored = readPortalData();
    const sessionId = localStorage.getItem(SESSION_KEY);
    setData(stored);
    setProfile(stored.profiles.find((person) => person.id === sessionId) ?? null);
  }, []);

  const visibleNav = useMemo(
    () => navItems.filter((item) => profile && roleAccess[profile.role].includes(item.path)),
    [profile],
  );
  const isStaff = profile?.role === "Admin" || profile?.role === "Technician";
  const page = routeMeta[pathname] ?? { title: "Overview", eyebrow: "Workspace overview", description: "Your service desk, at a glance." };
  const companyName = profile?.company ?? "ITServicePro";

  function signInAs(person: Profile) {
    localStorage.setItem(SESSION_KEY, person.id);
    setProfile(person);
    setMobileOpen(false);
    void navigate({ to: "/" });
    toast.success(`Welcome back, ${person.name.split(" ")[0]}`);
  }

  function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const match = data.profiles.find((person) => person.email.toLowerCase() === email && person.password === password);
    if (!match) {
      toast.error("Check your email and password, then try again.");
      return;
    }
    signInAs(match);
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const company = String(form.get("company") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!name || !email || password.length < 6 || !company) {
      toast.error("Add your name, email, company, and a password of at least 6 characters.");
      return;
    }
    if (data.profiles.some((person) => person.email.toLowerCase() === email)) {
      toast.error("An account already uses that email address.");
      return;
    }
    const person: Profile = {
      id: `u-${Date.now()}`,
      name,
      email,
      password,
      role: "Client",
      company,
      phone,
      initials: initialsFor(name),
    };
    const nextData = { ...data, profiles: [...data.profiles, person] };
    savePortalData(nextData);
    setData(nextData);
    signInAs(person);
  }

  function updateData(update: (current: PortalData) => PortalData) {
    setData((current) => {
      if (!current) return current;
      const next = update(current);
      savePortalData(next);
      return next;
    });
  }

  function recordsFor(section: DataSection) {
    if (!data) return [];
    const records = data[section];
    if (profile?.role !== "Client" || section === "services" || section === "articles") return records;
    if (section === "clients") return records.filter((record) => record.title === companyName);
    return records.filter((record) => record.client === companyName);
  }

  function filteredRecords(section: DataSection) {
    const rows = recordsFor(section);
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(needle)));
  }

  function changeStatus(section: "tickets" | "requests", recordId: string, status: string) {
    if (!isStaff) return;
    updateData((current) => ({
      ...current,
      [section]: current[section].map((record) => record.id === recordId ? { ...record, status, activity: `Status updated · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date())}` } : record),
    }));
    toast.success("Status updated");
  }

  function openCreate(kind: CreateKind, title = "") {
    setPresetTitle(title);
    setCreateKind(kind);
  }

  function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !profile || !createKind) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "General");
    const priority = String(form.get("priority") ?? "Medium");
    const description = String(form.get("description") ?? "").trim();
    const client = profile.role === "Client" ? profile.company : String(form.get("client") ?? profile.company);
    if (!title || !description) {
      toast.error("Add a title and a short description.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (createKind === "ticket") {
      const record: RecordItem = {
        id: newId("TK", data.tickets), title, category, priority, description, client,
        status: "Open", technician: "Unassigned", created: today, due: today,
        activity: `Submitted · ${formatShortDate(today)}`, price: "", sla: "", contact: profile.name,
        email: profile.email, phone: profile.phone, address: "", model: "", serial: "", assigned: "",
        purchase: "", warranty: "", helpful: "0", author: profile.name, body: "",
      };
      updateData((current) => ({ ...current, tickets: [record, ...current.tickets] }));
      setCreateKind(null);
      toast.success("Your support ticket was created");
      void navigate({ to: "/tickets" });
      return;
    }
    const record: RecordItem = {
      id: newId("SR", data.requests), title, category, priority, description, client,
      status: "Submitted", technician: "", created: today, due: today,
      activity: `Submitted · ${formatShortDate(today)}`, price: "", sla: "", contact: profile.name,
      email: profile.email, phone: profile.phone, address: "", model: "", serial: "", assigned: "",
      purchase: "", warranty: "", helpful: "0", author: profile.name, body: "",
    };
    updateData((current) => ({ ...current, requests: [record, ...current.requests] }));
    setCreateKind(null);
    toast.success("Your service request was submitted");
    void navigate({ to: "/requests" });
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
    setMobileOpen(false);
    setQuery("");
    toast("You have signed out");
  }

  function exportReport() {
    if (!data) return;
    const rows = recordsFor("tickets");
    const header = ["Ticket", "Client", "Category", "Priority", "Status", "Technician", "Created"];
    const csv = [header, ...rows.map((row) => [row.id, row.client, row.category, row.priority, row.status, row.technician, row.created])]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "itservicepro-ticket-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  if (!data) {
    return <div className="portal-auth-bg flex min-h-screen items-center justify-center p-6"><div className="portal-panel flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground"><Activity className="size-4 animate-pulse text-primary" /> Opening your workspace…</div></div>;
  }

  if (!profile) {
    return (
      <div className="portal-auth-bg min-h-screen px-5 py-10">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl overflow-hidden rounded-lg border bg-card shadow-lg lg:grid-cols-[1fr_1.05fr]">
          <section className="flex flex-col justify-between bg-primary p-8 text-primary-foreground sm:p-12">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-md bg-primary-foreground/15"><ShieldCheck className="size-6" /></span><div><p className="text-lg font-bold">ITServicePro</p><p className="text-xs text-primary-foreground/75">IT services management</p></div></div>
            <div className="my-12 max-w-sm"><p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary-foreground/75">One service desk. Clearer support.</p><h1 className="text-4xl font-semibold leading-tight">Keep every request moving.</h1><p className="mt-4 text-sm leading-6 text-primary-foreground/80">A connected workspace for service teams, client organizations, and the technology they rely on.</p><div className="mt-8 flex items-center gap-3 border-t border-primary-foreground/20 pt-5 text-sm"><span className="grid size-9 place-items-center rounded-md bg-primary-foreground/15"><Zap className="size-4" /></span><span>Support, assets, and service history in one view</span></div></div>
            <p className="text-xs text-primary-foreground/65">Securely organized for your team</p>
          </section>
          <section className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8"><p className="text-sm font-medium text-primary">Welcome to ITServicePro</p><h2 className="mt-2 text-2xl font-semibold">{authMode === "signin" ? "Sign in to your workspace" : "Create your client account"}</h2><p className="mt-2 text-sm text-muted-foreground">{authMode === "signin" ? "Use your work email to continue." : "Your account includes a profile for your organization."}</p></div>
              <form className="space-y-4" onSubmit={authMode === "signin" ? handleSignIn : handleRegister}>
                {authMode === "register" && <>
                  <label className="block space-y-1.5 text-sm font-medium">Full name<input name="name" autoComplete="name" className="portal-input" required placeholder="Taylor Brooks" /></label>
                  <label className="block space-y-1.5 text-sm font-medium">Organization<input name="company" className="portal-input" required placeholder="Your company" /></label>
                  <label className="block space-y-1.5 text-sm font-medium">Phone<input name="phone" autoComplete="tel" className="portal-input" placeholder="(555) 555-0100" /></label>
                </>}
                <label className="block space-y-1.5 text-sm font-medium">Work email<input name="email" type="email" autoComplete="email" className="portal-input" required placeholder="you@company.com" /></label>
                <label className="block space-y-1.5 text-sm font-medium">Password<input name="password" type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} minLength={6} className="portal-input" required placeholder="At least 6 characters" /></label>
                <Button type="submit" className="mt-2 w-full">{authMode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="size-4" /></Button>
              </form>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or continue with a demo profile<span className="h-px flex-1 bg-border" /></div>
              <div className="grid grid-cols-3 gap-2">
                {(["Admin", "Technician", "Client"] as Role[]).map((role) => {
                  const person = data.profiles.find((item) => item.role === role);
                  return person ? <Button key={role} type="button" variant="outline" className="h-auto min-h-14 flex-col gap-1 px-2 py-2" onClick={() => signInAs(person)}><span className="text-xs font-semibold">{role}</span><span className="max-w-full truncate text-[10px] text-muted-foreground">{person.email}</span></Button> : null;
                })}
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">{authMode === "signin" ? "New to the service desk?" : "Already have an account?"}{" "}<Button variant="link" size="sm" className="h-auto p-0 font-semibold" type="button" onClick={() => setAuthMode(authMode === "signin" ? "register" : "signin")}>{authMode === "signin" ? "Create a client account" : "Sign in"}</Button></p>
              <p className="mt-5 text-center text-xs text-muted-foreground">Demo workspace · data stays in this browser</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const activeProfile: Profile = profile;

  if (!roleAccess[activeProfile.role].includes(pathname)) {
    return <div className="portal-shell flex min-h-screen items-center justify-center p-6"><div className="portal-panel max-w-md p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-md bg-warning-soft text-warning"><ShieldCheck className="size-6" /></span><h1 className="mt-4 text-xl font-semibold">This area isn't available for your account</h1><p className="mt-2 text-sm text-muted-foreground">Your {activeProfile.role.toLowerCase()} profile can access its assigned service modules from the menu.</p><Button className="mt-6" onClick={() => void navigate({ to: "/" })}>Return to overview</Button></div></div>;
  }

  const tickets = recordsFor("tickets");
  const requests = recordsFor("requests");
  const openTickets = tickets.filter((item) => !["Resolved", "Closed"].includes(item.status));
  const activeRequests = requests.filter((item) => !["Completed", "Rejected"].includes(item.status));
  const priorityCount = tickets.filter((item) => ["Critical", "High"].includes(item.priority)).length;

  function table(section: DataSection, columns: { label: string; render: (row: RecordItem) => ReactNode }[], statuses?: string[]) {
    const rows = filteredRecords(section);
    return (
      <div className="portal-panel overflow-hidden">
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.label}>{column.label === "Status" && statuses && isStaff ? <select aria-label={`Status for ${row.title}`} className="portal-input min-w-36" value={row.status} onChange={(event) => changeStatus(section as "tickets" | "requests", row.id, event.target.value)}>{Array.from(new Set([...statuses, row.status])).map((status) => <option key={status} value={status}>{status}</option>)}</select> : column.render(row)}</td>)}</tr>)}</tbody>
          </table>
          {rows.length === 0 && <div className="px-6 py-14 text-center"><Search className="mx-auto size-7 text-muted-foreground/70" /><p className="mt-3 text-sm font-medium">No matching records</p><p className="mt-1 text-xs text-muted-foreground">Try a different search or update your filters.</p></div>}
        </div>
        {rows.length > 0 && <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{rows.length} {rows.length === 1 ? "record" : "records"}</span><span>Updated as changes are made</span></div>}
      </div>
    );
  }

  function itemTitle(row: RecordItem) {
    return <div className="min-w-48"><p className="font-semibold text-foreground">{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.id}</p></div>;
  }

  function pageContent() {
    const profile = activeProfile;
    if (pathname === "/") {
      const stats = [
        { label: "Open tickets", value: openTickets.length, detail: "Needs a response", icon: Ticket, path: "/tickets" as const, tone: "text-info" },
        { label: "High priority", value: priorityCount, detail: "Critical or high", icon: Activity, path: "/tickets" as const, tone: "text-warning" },
        { label: "Active requests", value: activeRequests.length, detail: "In the service queue", icon: ClipboardList, path: "/requests" as const, tone: "text-primary" },
        { label: "Tracked assets", value: recordsFor("assets").length, detail: "Across your workspace", icon: Laptop, path: "/assets" as const, tone: "text-success" },
      ];
      return <>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{page.eyebrow}</p><h1 className="mt-1 text-3xl font-semibold">{page.title}, {profile.name.split(" ")[0]}</h1><p className="mt-2 text-sm text-muted-foreground">{page.description}</p></div><Button onClick={() => openCreate("ticket")}><Plus className="size-4" />New ticket</Button></div>
        <div className="portal-stats grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map((stat) => <Link key={stat.label} to={stat.path} className="portal-card min-h-32 p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">{stat.label}</span><stat.icon className={`size-4 ${stat.tone}`} /></div><div className="mt-4 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums">{stat.value}</span><ArrowUpRight className="mb-1 size-4 text-muted-foreground" /></div><p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p></Link>)}</div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <section><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Recent tickets</h2><p className="mt-1 text-xs text-muted-foreground">Latest activity from your support queue</p></div><Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-medium text-primary">All tickets<ArrowRight className="size-4" /></Link></div><div className="portal-panel overflow-hidden"><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{tickets.slice(0, 5).map((ticket) => <tr key={ticket.id}><td>{itemTitle(ticket)}</td><td><StatusPill status={ticket.priority} /></td><td><StatusPill status={ticket.status} /></td><td className="whitespace-nowrap text-muted-foreground">{formatShortDate(ticket.created)}</td></tr>)}</tbody></table></div></div></section>
          <section><div className="mb-3"><h2 className="font-semibold">Service activity</h2><p className="mt-1 text-xs text-muted-foreground">A quick look at the current workload</p></div><div className="portal-panel p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Ticket status</p><p className="mt-1 text-xs text-muted-foreground">Current service queue</p></div><Activity className="size-5 text-primary" /></div><div className="mt-5 space-y-4">{["Open", "In Progress", "On Hold", "Resolved"].map((status) => { const count = tickets.filter((row) => row.status === status).length; const percent = tickets.length ? Math.round((count / tickets.length) * 100) : 0; return <div key={status}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{status}</span><span className="font-semibold tabular-nums">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div></div>; })}</div><div className="mt-6 border-t pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4" />Next response due within 2 business hours</div></div></div></section>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">{[{ title: "Browse services", path: "/services" as const, icon: Boxes, description: "Find support and submit a request." }, { title: "Search the knowledge base", path: "/knowledge" as const, icon: BookOpen, description: "Get answers to common IT questions." }, { title: "Review service requests", path: "/requests" as const, icon: ClipboardList, description: "Follow approvals and progress." }].filter((item) => roleAccess[profile.role].includes(item.path)).map((item) => <Link key={item.title} to={item.path} className="portal-card flex items-center gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><item.icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div>
      </>;
    }

    if (pathname === "/tickets") return <>
      <PageHeading page={page} action={<Button onClick={() => openCreate("ticket")}><Plus className="size-4" />New ticket</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{tickets.length} tickets across {profile.role === "Client" ? companyName : "all clients"}</p><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-4" />{openTickets.length} awaiting resolution</span></div></div>
      {table("tickets", [{ label: "Ticket", render: itemTitle }, { label: "Client", render: (row) => <span className="text-sm">{row.client}</span> }, { label: "Category", render: (row) => <span className="text-sm text-muted-foreground">{row.category}</span> }, { label: "Priority", render: (row) => <StatusPill status={row.priority} /> }, { label: "Status", render: (row) => <StatusPill status={row.status} /> }, { label: "Assignee", render: (row) => <span className="text-sm">{row.technician}</span> }, { label: "Created", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatShortDate(row.created)}</span> }], ticketStatuses)}
    </>;

    if (pathname === "/requests") return <>
      <PageHeading page={page} action={<Button onClick={() => openCreate("request")}><Plus className="size-4" />New request</Button>} />
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{requests.length} requests {profile.role === "Client" ? `for ${companyName}` : "in the service queue"}</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-4" />{activeRequests.length} active</span></div>
      {table("requests", [{ label: "Request", render: itemTitle }, { label: "Client", render: (row) => <span className="text-sm">{row.client}</span> }, { label: "Request type", render: (row) => <span className="text-sm text-muted-foreground">{row.category}</span> }, { label: "Priority", render: (row) => <StatusPill status={row.priority} /> }, { label: "Status", render: (row) => <StatusPill status={row.status} /> }, { label: "Submitted", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatShortDate(row.created)}</span> }], requestStatuses)}
    </>;

    if (pathname === "/services") return <>
      <PageHeading page={page} />
      <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{filteredRecords("services").length} services available</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success" />Service team response times included</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredRecords("services").map((service) => <article key={service.id} className="portal-card flex min-h-56 flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-md bg-secondary text-primary"><Boxes className="size-5" /></span><StatusPill status={service.status} /></div><p className="mt-4 text-xs font-medium text-primary">{service.category}</p><h2 className="mt-1 text-lg font-semibold">{service.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{service.description}</p><div className="mt-5 flex items-end justify-between border-t pt-4"><div><p className="text-sm font-semibold">{service.price}</p><p className="mt-1 text-xs text-muted-foreground">Response: {service.sla}</p></div><Button variant="outline" size="sm" onClick={() => openCreate("request", service.title)}>Request service<ArrowRight className="size-3.5" /></Button></div></article>)}</div>
      {filteredRecords("services").length === 0 && <EmptyState query={query} />}
    </>;

    if (pathname === "/assets") return <>
      <PageHeading page={page} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{recordsFor("assets").length} assets tracked</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Laptop className="size-4" />Devices and licenses</span></div>
      {table("assets", [{ label: "Asset", render: itemTitle }, { label: "Type", render: (row) => <span className="text-sm">{row.category}</span> }, { label: "Model", render: (row) => <span className="text-sm text-muted-foreground">{row.model}</span> }, { label: "Assigned to", render: (row) => <span className="text-sm">{row.assigned}</span> }, { label: "Status", render: (row) => <StatusPill status={row.status} /> }, { label: "Warranty", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatShortDate(row.warranty)}</span> }])}
    </>;

    if (pathname === "/clients") return <>
      <PageHeading page={page} />
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{recordsFor("clients").length} organizations</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="size-4" />Client directory</span></div>
      {table("clients", [{ label: "Organization", render: itemTitle }, { label: "Industry", render: (row) => <span className="text-sm">{row.category}</span> }, { label: "Primary contact", render: (row) => <div><p className="text-sm">{row.contact}</p><p className="mt-1 text-xs text-muted-foreground">{row.email}</p></div> }, { label: "Phone", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{row.phone}</span> }, { label: "Status", render: (row) => <StatusPill status={row.status} /> }, { label: "Since", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatShortDate(row.created)}</span> }])}
    </>;

    if (pathname === "/knowledge") return <>
      <PageHeading page={page} />
      <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{filteredRecords("articles").length} guides and walkthroughs</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><BookOpen className="size-4" />Reviewed by ITServicePro support</span></div>
          <div className="grid gap-3 lg:grid-cols-2">{filteredRecords("articles").map((article) => <article key={article.id} className="portal-card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><BookOpen className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-primary">{article.category}</p><Button variant="link" size="sm" className="mt-1 h-auto whitespace-normal p-0 text-left text-base font-semibold text-foreground hover:text-primary" type="button" onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}>{article.title}</Button><p className="mt-2 text-sm leading-6 text-muted-foreground">{article.description}</p>{expandedArticle === article.id && <div className="mt-4 whitespace-pre-line border-t pt-4 text-sm leading-6 text-foreground/85">{article.body}</div>}<div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{article.helpful} found this helpful</span><Button variant="ghost" size="sm" onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}>{expandedArticle === article.id ? "Show less" : "Read guide"}<ArrowRight className="size-3.5" /></Button></div></div></div></article>)}</div>
      {filteredRecords("articles").length === 0 && <EmptyState query={query} />}
    </>;

    if (pathname === "/reports") {
      const resolved = tickets.filter((item) => ["Resolved", "Closed"].includes(item.status)).length;
      const resolutionRate = tickets.length ? Math.round((resolved / tickets.length) * 100) : 0;
      const categoryCounts = categoryOptions.map((category) => ({ category, count: tickets.filter((item) => item.category === category).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
      const statusCounts = ticketStatuses.map((status) => ({ status, count: tickets.filter((item) => item.status === status).length }));
      return <>
        <PageHeading page={page} action={<Button variant="outline" onClick={exportReport}><Download className="size-4" />Export CSV</Button>} />
        <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />All available ticket activity</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Total tickets", value: tickets.length, icon: Ticket }, { label: "Open workload", value: openTickets.length, icon: Activity }, { label: "Resolution rate", value: `${resolutionRate}%`, icon: Check }, { label: "Service requests", value: activeRequests.length, icon: ClipboardList }].map((item) => <div className="portal-card p-5" key={item.label}><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{item.label}</span><item.icon className="size-4 text-primary" /></div><p className="mt-4 text-3xl font-semibold tabular-nums">{item.value}</p></div>)}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="portal-panel p-5"><h2 className="font-semibold">Tickets by status</h2><p className="mt-1 text-xs text-muted-foreground">Current state of the support queue</p><div className="mt-6 space-y-4">{statusCounts.map(({ status, count }) => { const percent = tickets.length ? Math.round((count / tickets.length) * 100) : 0; return <div key={status}><div className="mb-1.5 flex justify-between text-sm"><span>{status}</span><span className="tabular-nums text-muted-foreground">{count} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; })}</div></section><section className="portal-panel p-5"><h2 className="font-semibold">Demand by service area</h2><p className="mt-1 text-xs text-muted-foreground">Tickets grouped by category</p><div className="mt-6 space-y-4">{categoryCounts.map(({ category, count }) => { const percent = tickets.length ? Math.round((count / tickets.length) * 100) : 0; return <div key={category}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span>{category}</span><span className="tabular-nums text-muted-foreground">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-info" style={{ width: `${percent}%` }} /></div></div>; })}</div></section></div>
        <section className="mt-5"><div className="mb-3"><h2 className="font-semibold">Ticket detail</h2><p className="mt-1 text-xs text-muted-foreground">A downloadable record of the current queue</p></div>{table("tickets", [{ label: "Ticket", render: itemTitle }, { label: "Client", render: (row) => <span className="text-sm">{row.client}</span> }, { label: "Priority", render: (row) => <StatusPill status={row.priority} /> }, { label: "Status", render: (row) => <StatusPill status={row.status} /> }, { label: "Created", render: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatShortDate(row.created)}</span> }])}</section>
      </>;
    }
    return null;
  }

  const heading = page.title === "Good morning" ? `Good morning, ${profile.name.split(" ")[0]}` : page.title;
  return (
    <div className="portal-shell min-h-screen">
      {mobileOpen && <button type="button" aria-label="Close navigation" className="portal-mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className="portal-sidebar" data-open={mobileOpen}>
        <div className="flex h-[72px] items-center gap-3 border-b px-5"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span><div><p className="text-sm font-bold">ITServicePro</p><p className="text-[10px] text-muted-foreground">SERVICE MANAGEMENT</p></div><Button className="ml-auto lg:hidden" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X /></Button></div>
        <div className="px-4 pt-5"><p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p><nav className="mt-2 space-y-1">{visibleNav.map((item) => { const Icon = iconByPath[item.path]; return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} data-active={pathname === item.path} className="portal-nav-link"><Icon className="size-4" /><span className="flex-1">{item.label}</span>{pathname === item.path && <span className="size-1.5 rounded-full bg-primary" />}</Link>; })}</nav></div>
        <div className="mt-auto p-4"><div className="rounded-md border bg-muted/50 p-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-md bg-card text-primary"><LifeBuoy className="size-4" /></span><div><p className="text-xs font-semibold">Need a hand?</p><p className="text-[10px] text-muted-foreground">Browse support guides</p></div></div><Link to="/knowledge" className="mt-3 flex items-center justify-between text-xs font-semibold text-primary">Knowledge base<ArrowRight className="size-3.5" /></Link></div><div className="mt-4 flex items-center gap-3 border-t pt-4"><div className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{profile.initials || initialsFor(profile.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{profile.name}</p><p className="truncate text-[10px] text-muted-foreground">{profile.role} · {companyName}</p></div><Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut className="size-4" /></Button></div></div>
      </aside>
      <div className="portal-main">
        <header className="portal-topbar"><div className="flex min-w-0 items-center gap-3"><Button className="lg:hidden" variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></Button><div className="hidden min-w-0 sm:block"><p className="truncate text-xs text-muted-foreground">{companyName}</p><p className="truncate text-sm font-semibold">{heading}</p></div></div><div className="flex items-center gap-2 sm:gap-3"><label className="relative hidden w-56 md:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} className="portal-input pl-9" placeholder="Search this page" /></label><Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications" onClick={() => toast("You're all caught up")}><Bell className="size-4" /></Button><div className="hidden h-8 w-px bg-border sm:block" /><div className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" title={profile.name}>{profile.initials || initialsFor(profile.name)}</div><span className="hidden max-w-32 truncate text-xs font-medium sm:block">{profile.name}</span><ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" /></div></header>
        <div className="border-b bg-card px-4 py-3 md:hidden"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} className="portal-input pl-9" placeholder="Search this page" /></label></div>
        <main className="portal-content">{pageContent()}</main>
      </div>
      {createKind && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateKind(null); }}><section role="dialog" aria-modal="true" aria-labelledby="create-heading" className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-primary">{createKind === "ticket" ? "Support" : "Service catalog"}</p><h2 id="create-heading" className="mt-1 text-xl font-semibold">{createKind === "ticket" ? "Create a support ticket" : "Submit a service request"}</h2><p className="mt-1 text-sm text-muted-foreground">Share a few details so the team can help.</p></div><Button variant="ghost" size="icon" aria-label="Close form" onClick={() => setCreateKind(null)}><X /></Button></div><form className="mt-6 space-y-4" onSubmit={createRecord}><label className="block space-y-1.5 text-sm font-medium">Title<input name="title" className="portal-input" required defaultValue={presetTitle} placeholder={createKind === "ticket" ? "What do you need help with?" : "What service do you need?"} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Category<select name="category" className="portal-input">{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="block space-y-1.5 text-sm font-medium">Priority<select name="priority" className="portal-input">{["Critical", "High", "Medium", "Low"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label></div>{profile.role !== "Client" && <label className="block space-y-1.5 text-sm font-medium">Client<select name="client" className="portal-input">{data.clients.map((client) => <option key={client.id} value={client.title}>{client.title}</option>)}</select></label>}<label className="block space-y-1.5 text-sm font-medium">Description<textarea name="description" className="portal-input min-h-28 resize-y" required placeholder="Include any details that will help us get started." /></label><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setCreateKind(null)}>Cancel</Button><Button type="submit"><Plus className="size-4" />{createKind === "ticket" ? "Create ticket" : "Submit request"}</Button></div></form></section></div>}
    </div>
  );
}

function PageHeading({ page, action }: { page: { title: string; eyebrow: string; description: string }; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{page.eyebrow}</p><h1 className="mt-1 text-3xl font-semibold">{page.title}</h1><p className="mt-2 text-sm text-muted-foreground">{page.description}</p></div>{action}</div>;
}

function EmptyState({ query }: { query: string }) {
  return <div className="portal-panel px-6 py-14 text-center"><Search className="mx-auto size-7 text-muted-foreground/70" /><p className="mt-3 text-sm font-medium">{query ? "No matching records" : "Nothing here yet"}</p><p className="mt-1 text-xs text-muted-foreground">{query ? "Try a different search." : "New records will appear here."}</p></div>;
}