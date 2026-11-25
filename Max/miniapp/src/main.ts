import "../styles.css";
import type { MeResponse } from "./api.js";
import { fetchMe } from "./api.js";
import { subscribeData } from "./data/events.js";
import { getLocalDb, persistDb } from "./db/localDb.js";
import {
  dirViewToDataset,
  type DirScreen,
  renderDirectories,
} from "./directoriesView.js";
import { setAppLanguage } from "./localeContext.js";
import { type AppLanguage, strings, type UiStrings } from "./i18n.js";
import { deferRenderUntilBlur } from "./ui/editingGuard.js";
import {
  showProCloudSyncWarningIfNeeded,
  updateCloudTabWarningStyle,
} from "./ui/proCloudSyncWarning.js";
import { initMaxWebApp } from "./maxBridge.js";
import { reportLocalClientCount } from "./reportLocalStats.js";
import { configureProSync } from "./sync/proSync.js";
import { refreshCloudSession, renderCloudView } from "./views/cloudView.js";
import { type ClientsRoute, renderClientsView } from "./views/clientsView.js";
import { emptyPurchaseNewDraft, type PurchaseNewDraft } from "./views/purchaseNewView.js";
import { type TodayViewState, renderTodayView } from "./views/todayView.js";

const screen = document.getElementById("screen")!;
let t: UiStrings = strings("ru");

type PrimaryTab = "today" | "clients" | "directories" | "cloud";

let me: MeResponse;
let primary: PrimaryTab = "today";
let todayState: TodayViewState = { day: todayIso() };
let clientQuery = "";
let clientsRoute: ClientsRoute = "list";
let dirView: DirScreen = "home";

let clientSearchDebounce: ReturnType<typeof setTimeout> | null = null;
let refocusClientSearch = false;

const CLIENT_SEARCH_DEBOUNCE_MS = 280;

const purchaseNewDrafts = new Map<string, PurchaseNewDraft>();

function purchaseDraftFor(clientId: string): PurchaseNewDraft {
  return purchaseNewDrafts.get(clientId) ?? emptyPurchaseNewDraft();
}

function setPurchaseDraft(clientId: string, draft: PurchaseNewDraft): void {
  purchaseNewDrafts.set(clientId, draft);
}

function isPurchaseNewRoute(): boolean {
  return typeof clientsRoute === "object" && clientsRoute !== null && "purchaseNew" in clientsRoute;
}

let cloudUi = {
  email: "",
  code: "",
  busy: false,
  notice: null as string | null,
  signedInEmail: null as string | null,
};

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function refreshProSyncContext(): void {
  configureProSync(me, Boolean(cloudUi.signedInEmail));
}

function patchCloudUi(patch: Partial<typeof cloudUi>): void {
  const prevSignedIn = cloudUi.signedInEmail;
  cloudUi = { ...cloudUi, ...patch };
  if (patch.signedInEmail !== undefined && patch.signedInEmail !== prevSignedIn) {
    refreshProSyncContext();
    updateCloudTabWarningStyle(me, cloudUi.signedInEmail);
  }
  if (primary !== "cloud") return;
  const run = () => void renderScreen();
  if (deferRenderUntilBlur(run)) return;
  run();
}

function setNavHighlight(): void {
  document.querySelectorAll("[data-primary]").forEach((el) => {
    el.classList.toggle("active", (el as HTMLElement).dataset.primary === primary);
  });
}

function syncCloudTabVisibility(profile: MeResponse): void {
  const cloudTab = document.querySelector<HTMLElement>('[data-primary="cloud"]');
  if (!cloudTab) return;
  const show = profile.tier === "pro";
  cloudTab.hidden = !show;
  cloudTab.toggleAttribute("aria-hidden", !show);
  cloudTab.disabled = !show;
  if (!show && primary === "cloud") primary = "today";
  updateCloudTabWarningStyle(profile, cloudUi.signedInEmail);
}

function applyLocale(lang: AppLanguage): void {
  t = strings(lang);
  setAppLanguage(lang);
  document.documentElement.lang = lang;
  const nav = document.querySelector(".tabs-primary");
  nav?.setAttribute("aria-label", t.navSections);
  const tabs: Array<{ key: PrimaryTab; label: string }> = [
    { key: "today", label: t.today },
    { key: "clients", label: t.clients },
    { key: "directories", label: t.directories },
    { key: "cloud", label: t.tabCloud },
  ];
  for (const { key, label } of tabs) {
    document.querySelector<HTMLElement>(`[data-primary="${key}"]`)?.setAttribute("aria-label", label);
  }
}

async function syncProfileFromServer(): Promise<void> {
  if (!me) return;
  const prev = me;
  const next = await fetchMe(prev.language);
  const langChanged = next.language !== prev.language;
  const tierChanged = next.tier !== prev.tier;
  me = next;
  if (langChanged) applyLocale(me.language);
  if (tierChanged) syncCloudTabVisibility(me);
  else updateCloudTabWarningStyle(me, cloudUi.signedInEmail);
  refreshProSyncContext();
  if (langChanged || tierChanged) await renderScreen();
}

async function renderScreen(): Promise<void> {
  setNavHighlight();

  if (primary === "cloud" && me.tier !== "pro") {
    primary = "today";
  }

  if (primary === "today") {
    await renderTodayView(
      screen,
      me,
      t,
      todayState,
      (day) => {
        todayState = { day };
        void renderScreen();
      },
      (clientId) => {
        primary = "clients";
        clientsRoute = { edit: clientId };
        void renderScreen();
      },
    );
  } else if (primary === "clients") {
    await renderClientsView(
      screen,
      me,
      t,
      clientsRoute,
      clientQuery,
      (q) => {
        clientQuery = q;
        refocusClientSearch = document.activeElement?.id === "client-search";
        if (clientSearchDebounce) clearTimeout(clientSearchDebounce);
        clientSearchDebounce = setTimeout(() => {
          clientSearchDebounce = null;
          void renderScreen();
        }, CLIENT_SEARCH_DEBOUNCE_MS);
      },
      (route) => {
        clientsRoute = route;
        void renderScreen();
      },
      () => void renderScreen(),
      purchaseDraftFor,
      setPurchaseDraft,
    );
  } else if (primary === "cloud") {
    await renderCloudView(screen, me, t, cloudUi, patchCloudUi, () => {
      primary = "today";
      void renderScreen();
    }, { embedded: true });
  } else {
    screen.dataset.dirView = dirViewToDataset(dirView);
    await renderDirectories(
      screen,
      me,
      t,
      dirView,
      async (next) => {
        dirView = next;
        screen.dataset.dirView = dirViewToDataset(next);
        await renderScreen();
      },
      () => void renderScreen(),
    );
  }
  if (primary !== "cloud") {
    await persistDb();
    void reportLocalClientCount();
  }

  if (refocusClientSearch && primary === "clients" && clientsRoute === "list") {
    const el = document.getElementById("client-search") as HTMLInputElement | null;
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
    refocusClientSearch = false;
  }
}

function refreshCrmFromDataEvent(): void {
  if (primary === "cloud") return;
  if (primary === "clients" && isPurchaseNewRoute()) return;
  const run = () => void renderScreen();
  if (deferRenderUntilBlur(run)) return;
  run();
}

async function showPrimary(tab: PrimaryTab): Promise<void> {
  primary = tab;
  if (tab === "directories") dirView = "home";
  if (tab === "clients") clientsRoute = "list";
  if (tab === "cloud") {
    if (me.tier !== "pro") {
      primary = "today";
      await renderScreen();
      return;
    }
    await refreshCloudSession(me, (email) => {
      cloudUi = { ...cloudUi, signedInEmail: email };
      refreshProSyncContext();
    });
  }
  await renderScreen();
}

async function main(): Promise<void> {
  initMaxWebApp();
  screen.textContent = strings("ru").loading;

  me = await fetchMe();
  applyLocale(me.language);
  syncCloudTabVisibility(me);
  await getLocalDb();
  void reportLocalClientCount();

  await refreshCloudSession(me, (email) => {
    cloudUi = { ...cloudUi, signedInEmail: email };
    refreshProSyncContext();
  });
  refreshProSyncContext();

  subscribeData(refreshCrmFromDataEvent);

  document.querySelectorAll("[data-primary]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = (btn as HTMLElement).dataset.primary as PrimaryTab;
      if (tab === "cloud" && (me.tier !== "pro" || (btn as HTMLElement).hidden)) return;
      void showPrimary(tab);
    });
  });

  await renderScreen();
  updateCloudTabWarningStyle(me, cloudUi.signedInEmail);
  await showProCloudSyncWarningIfNeeded(t, me, cloudUi.signedInEmail);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void syncProfileFromServer()
      .then(async () => {
        updateCloudTabWarningStyle(me, cloudUi.signedInEmail);
        await showProCloudSyncWarningIfNeeded(t, me, cloudUi.signedInEmail);
      })
      .catch(() => {});
  });
}

main().catch((err) => {
  screen.innerHTML = `<p class="muted">${strings("ru").cloudError(err)}</p>`;
});