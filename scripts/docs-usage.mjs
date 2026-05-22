// Per-item .slint usage snippets for the generated docs pages.
// Keyed by registry item name. Install commands are derived from the registry
// (slintcn add <name>), so only the usage code lives here.
// Items not listed fall back to a generic import line in the generator.

export const usage = {
  button: `import { Button, ButtonVariant, ButtonSize } from "slintcn/components/button.slint";

Button {
    variant: ButtonVariant.default;
    size: ButtonSize.lg;
    text: "Ship it";
    clicked => { /* … */ }
}`,

  card: `import { Card, CardVariant } from "slintcn/components/card.slint";

Card {
    variant: CardVariant.solid;
    VerticalLayout {
        padding: parent.padding-l;
        spacing: parent.gap-l;
        // your content
    }
}`,

  input: `import { Input } from "slintcn/components/input.slint";

Input {
    placeholder: "you@example.com";
    text <=> email;
    edited(t) => { /* … */ }
}`,

  badge: `import { Badge, BadgeVariant } from "slintcn/components/badge.slint";

Badge { text: "New"; variant: BadgeVariant.default; }`,

  separator: `import { Separator, SeparatorOrientation } from "slintcn/components/separator.slint";

Separator { orientation: SeparatorOrientation.horizontal; }`,

  label: `import { Label, LabelVariant } from "slintcn/components/label.slint";

Label { text: "Email"; variant: LabelVariant.required; }`,

  dialog: `import { Dialog } from "slintcn/components/dialog.slint";

// Mount as the LAST child of Window:
dlg := Dialog {
    width: parent.width;
    height: parent.height;
    open <=> dialog-open;
    title: "Confirm your action";
    description: "This cannot be undone.";
}`,

  "alert-dialog": `import { AlertDialog } from "slintcn/components/alert-dialog.slint";

AlertDialog {
    width: parent.width;
    height: parent.height;
    open <=> alert-open;
    title: "Delete this account?";
    description: "This action cannot be undone.";
    confirmed => { /* … */ }
}`,

  sheet: `import { Sheet, SheetSide } from "slintcn/components/sheet.slint";

Sheet {
    width: parent.width;
    height: parent.height;
    open <=> sheet-open;
    side: SheetSide.right;
    title: "Filters";
}`,

  "dialog-panel": `import { DialogPanel } from "slintcn/components/dialog-panel.slint";

// Headless: mount in your own overlay root, control visibility + centering.
DialogPanel {
    title: "Confirm your action";
    description: "This cannot be undone.";
    closed => { /* hide me */ }
}`,

  "alert-dialog-panel": `import { AlertDialogPanel } from "slintcn/components/alert-dialog-panel.slint";

AlertDialogPanel {
    title: "Delete this account?";
    description: "This action cannot be undone.";
    confirmed => { /* … */ }
    cancelled => { /* … */ }
}`,

  "sheet-panel": `import { SheetPanel } from "slintcn/components/sheet-panel.slint";

// You position + size it inside your overlay root.
SheetPanel {
    title: "Filters";
    description: "Refine your results.";
}`,

  tooltip: `import { Tooltip, TooltipSide } from "slintcn/components/tooltip.slint";

Tooltip {
    text: "Add to library";
    side: TooltipSide.top;
    Button { text: "Hover me"; }
}`,

  toast: `import { Toaster, ToastQueue, ToastVariant } from "slintcn/components/toast.slint";

// Mount once at Window root:
Toaster { width: parent.width; height: parent.height; }

// Fire from anywhere:
ToastQueue.show("Event created", ToastVariant.success);`,

  tabs: `import { Tabs, TabsVariant } from "slintcn/components/tabs.slint";

Tabs {
    items: [{ label: "Account" }, { label: "Password" }];
    current <=> tab;
}
if tab == 0: /* Account content */`,

  checkbox: `import { Checkbox } from "slintcn/components/checkbox.slint";

Checkbox { label: "Accept terms"; checked <=> accepted; }`,

  switch: `import { Switch } from "slintcn/components/switch.slint";

Switch { label: "Dark mode"; checked <=> dark; }`,

  icon: `import { Icon } from "slintcn/components/icon.slint";
import { LucidePaths } from "slintcn/components/lucide-paths.slint";

Icon { commands: LucidePaths.check; size: 20px; tint: Tokens.color-foreground; }`,

  "radio-group": `import { RadioGroup, RadioOrientation } from "slintcn/components/radio-group.slint";

RadioGroup {
    items: [{ label: "Free" }, { label: "Pro" }, { label: "Team" }];
    selected <=> tier;
    changed(i) => { /* … */ }
}`,

  select: `import { Select, SelectItem } from "slintcn/components/select.slint";

Select {
    items: [{ label: "Monthly" }, { label: "Yearly (-20%)" }];
    selected-index <=> billing;
    changed(i) => { /* … */ }
}`,

  progress: `import { Progress } from "slintcn/components/progress.slint";

Progress { value: 64; } // 0–100`,

  skeleton: `import { Skeleton } from "slintcn/components/skeleton.slint";

Skeleton { width: 220px; height: 16px; }`,

  avatar: `import { Avatar } from "slintcn/components/avatar.slint";

Avatar { fallback: "SK"; size: 40px; } // or source: @image-url(...)`,

  alert: `import { Alert, AlertVariant } from "slintcn/components/alert.slint";
import { LucidePaths } from "slintcn/components/lucide-paths.slint";

Alert {
    icon: LucidePaths.check;
    title: "Deployed";
    description: "Your changes are live.";
}`,

  textarea: `import { Textarea } from "slintcn/components/textarea.slint";

Textarea { placeholder: "Tell us about yourself…"; text <=> bio; }`,

  toggle: `import { Toggle, ToggleVariant } from "slintcn/components/toggle.slint";

Toggle { text: "Bold"; pressed <=> bold; }`,

  "toggle-group": `import { ToggleGroup, ToggleGroupItem } from "slintcn/components/toggle-group.slint";

ToggleGroup {
    items: [{ label: "Left" }, { label: "Center" }, { label: "Right" }];
    selected <=> align;
}`,

  accordion: `import { Accordion, AccordionItem } from "slintcn/components/accordion.slint";

Accordion {
    open-index <=> open;
    items: [
        { title: "Is it accessible?", content: "Yes — keyboard + Space toggle." },
        { title: "Is it styled?", content: "Dark glass by default." },
    ];
}`,

  slider: `import { Slider } from "slintcn/components/slider.slint";

Slider { value <=> volume; minimum: 0; maximum: 100; }`,

  breadcrumb: `import { Breadcrumb, BreadcrumbItem } from "slintcn/components/breadcrumb.slint";

Breadcrumb {
    items: [{ label: "Home" }, { label: "Components" }, { label: "Breadcrumb" }];
    navigate(i) => { /* … */ }
}`,

  pagination: `import { Pagination } from "slintcn/components/pagination.slint";

Pagination { total: 5; current <=> page; changed(p) => { /* … */ } }`,

  table: `import { Table, TableRow } from "slintcn/components/table.slint";

Table {
    columns: ["Invoice", "Status", "Amount"];
    rows: [
        { cells: ["INV-001", "Paid", "$ 250.00"] },
        { cells: ["INV-002", "Pending", "$ 1,200.00"] },
    ];
}`,

  text: `// alias to avoid shadowing the built-in Text:
import { Text as Typography, TextVariant, TextTone } from "slintcn/components/text.slint";

Typography { text: "Display"; variant: TextVariant.display; }
Typography { text: "Muted body"; variant: TextVariant.body; tone: TextTone.muted; }`,

  keycap: `import { Keycap, KeycapSize, KeycapTone } from "slintcn/components/keycap.slint";

Keycap { text: "⌘"; tone: KeycapTone.on-glass; }`,

  "hud-pill": `import { HudPill, HudPillSize, HudPillTone } from "slintcn/components/hud-pill.slint";

HudPill { text: "120 FPS"; tone: HudPillTone.scrim1; }`,

  "slot-tile": `import { SlotTile, SlotTileTone, SlotTileState } from "slintcn/components/slot-tile.slint";

SlotTile {
    tone: SlotTileTone.stone;
    state: SlotTileState.active;
    interactive: true;
    // place an icon / Keycap / Badge inside
}`,

  "scroll-area": `import { ScrollArea } from "slintcn/components/scroll-area.slint";

ScrollArea {
    content-height: 480px;          // total scrollable height
    VerticalLayout { height: 480px; /* tall content */ }
}`,

  popover: `import { Popover } from "slintcn/components/popover.slint";

Popover {
    title: "Dimensions";
    description: "Set the width and height.";
    Button { text: "Open popover"; }   // trigger = @children
}`,

  "context-menu": `import { ContextMenu, ContextMenuItemData } from "slintcn/components/context-menu.slint";

ContextMenu {
    items: [{ label: "Cut" }, { label: "Copy" }, { label: "Paste" }];
    selected(i) => { /* … */ }
    // right-clickable area = @children
}`,

  "dropdown-menu": `import { DropdownMenu, DropdownMenuItem } from "slintcn/components/dropdown-menu.slint";

DropdownMenu {
    items: [{ label: "Profile" }, { label: "Billing" }, { label: "Sign out" }];
    selected(i) => { /* … */ }
    Button { text: "Open menu"; }   // trigger = @children
}`,

  "hover-card": `import { HoverCard } from "slintcn/components/hover-card.slint";

HoverCard {
    title: "@sofia";
    description: "Product designer. Building tools for makers.";
    Button { text: "@sofia"; }   // trigger = @children
}`,

  menubar: `import { Menubar, MenubarMenu, MenubarItem } from "slintcn/components/menubar.slint";

Menubar {
    menus: [
        { label: "File", items: [{ label: "New" }, { label: "Save" }] },
        { label: "Edit", items: [{ label: "Undo" }, { label: "Redo" }] },
    ];
    selected(mi, ii) => { /* … */ }
}`,

  "navigation-menu": `import { NavigationMenu, NavigationItem } from "slintcn/components/navigation-menu.slint";

NavigationMenu {
    items: [{ label: "Overview" }, { label: "Customers" }, { label: "Products" }];
    active <=> page;
    navigate(i) => { /* … */ }
}`,

  // ── blocks ──
  "sign-in": `import { SignIn } from "slintcn/blocks/sign-in.slint";

SignIn {
    email <=> email;
    password <=> password;
    submit => { /* authenticate */ }
    forgot => { /* … */ }
}`,

  login: `import { Login } from "slintcn/blocks/login.slint";

Login {
    email <=> email;
    password <=> password;
    submit => { /* … */ }
    sso => { /* … */ }
}`,

  pricing: `import { Pricing } from "slintcn/blocks/pricing.slint";

Pricing { chosen: 1; pick(i) => { /* … */ } }`,

  dashboard: `import { Dashboard } from "slintcn/blocks/dashboard.slint";

Dashboard { }   // edit the inline metric + activity data after install`,

  settings: `import { Settings } from "slintcn/blocks/settings.slint";

Settings {
    display-name <=> name;
    email <=> email;
    save => { /* … */ }
}`,

  team: `import { Team, TeamMember } from "slintcn/blocks/team.slint";

Team {
    members: [{ name: "Sofia Davis", email: "sofia@acme.dev", role: "Owner", initials: "SD" }];
    invite => { /* … */ }
    manage(i) => { /* … */ }
}`,

  profile: `import { Profile } from "slintcn/blocks/profile.slint";

Profile {
    display-name <=> name;
    email <=> email;
    bio <=> bio;
    save => { /* … */ }
    cancel => { /* … */ }
}`,

  stats: `import { Stats, StatMetric, TrafficSource } from "slintcn/blocks/stats.slint";

Stats { }   // edit the inline metrics + sources after install`,
};
