import { fetchMe } from "./api.js";
import { strings } from "./i18n.js";
import { bindCloudNativeBack, closeMaxWebApp, isOpenedInsideMax } from "./maxBridge.js";
import { showProCloudSyncWarningIfNeeded } from "./ui/proCloudSyncWarning.js";
import { refreshCloudSession, renderCloudView } from "./views/cloudView.js";

/** Экран облака внутри index.html (без редиректа — не блокирует CRM). */
export async function mountCloudApp(screen: HTMLElement): Promise<void> {
  let cloudUi = {
    email: "",
    code: "",
    busy: false,
    notice: null as string | null,
    signedInEmail: null as string | null,
  };

  function patchCloudUi(patch: Partial<typeof cloudUi>): void {
    cloudUi = { ...cloudUi, ...patch };
    void render();
  }

  document.body.classList.add("app-cloud");
  document.querySelector(".tabs-primary")?.setAttribute("hidden", "true");
  document.getElementById("app")?.classList.add("app-cloud-shell");

  const me = await fetchMe();
  const t = strings(me.language);
  if (isOpenedInsideMax()) {
    bindCloudNativeBack(() => closeMaxWebApp());
  }
  await refreshCloudSession(me, (email) => {
    cloudUi = { ...cloudUi, signedInEmail: email };
  });

  async function render(): Promise<void> {
    await renderCloudView(screen, me, t, cloudUi, patchCloudUi, () => closeMaxWebApp(), { embedded: false });
  }

  await render();
  await showProCloudSyncWarningIfNeeded(t, me, cloudUi.signedInEmail);
}