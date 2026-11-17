import "../styles.css";
import type { MeResponse } from "./api.js";
import { fetchMe } from "./api.js";
import { getLocalDb, persistDb } from "./db/localDb.js";
import {
  dirViewToDataset,
  type DirScreen,
  renderDirectories,
} from "./directoriesView.js";
import { strings } from "./i18n.js";
import { initMaxWebApp } from "./maxBridge.js";
import { type ClientsRoute, renderClientsView } from "./views/clientsView.js";
import { type TodayViewState, renderTodayView } from "./views/todayView.js";

const screen = document.getElementById("screen")!;
const t = strings("ru");

type PrimaryTab = "today" | "clients" | "directories";

let me: MeResponse;
let primary: PrimaryTab = "today";
let todayState: TodayViewState = { day: todayIso() };
let clientQuery = "";
let clientsRoute: ClientsRoute = "list";
let dirView: DirScreen = "home";

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function setNavHighlight(): void {
  document.querySelectorAll("[data-primary]").forEach((el) => {
    el.classList.toggle("active", (el as HTMLElement).dataset.primary === primary);
  });
}

async function renderScreen(): Promise<void> {
  setNavHighlight();

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
        void renderScreen();
      },
      (route) => {
        clientsRoute = route;
        void renderScreen();
      },
      () => void renderScreen(),
    );
  } else {
    screen.dataset.dirView = dirViewToDataset(dirView);
    await renderDirectories(
      screen,
      me,
      dirView,
      async (next) => {
        dirView = next;
        screen.dataset.dirView = dirViewToDataset(next);
        await renderScreen();
      },
      () => void renderScreen(),
    );
  }
  await persistDb();
}

async function showPrimary(tab: PrimaryTab): Promise<void> {
  primary = tab;
  if (tab === "directories") dirView = "home";
  if (tab === "clients") clientsRoute = "list";
  await renderScreen();
}

async function main(): Promise<void> {
  initMaxWebApp();
  me = await fetchMe();
  await getLocalDb();

  document.querySelectorAll("[data-primary]").forEach((btn) => {
    btn.addEventListener("click", () => void showPrimary((btn as HTMLElement).dataset.primary as PrimaryTab));
  });

  await showPrimary("today");
}

main().catch((err) => {
  screen.innerHTML = `<p class="muted">Ошибка: ${String(err)}</p>`;
});