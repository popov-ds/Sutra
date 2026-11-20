import type { MeResponse } from "../api.js";
import { closeMaxWebApp, isOpenedInsideMax } from "../maxBridge.js";
import type { UiStrings } from "../i18n.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";
import {
  getSupabase,
  runCloudSync,
  sendEmailOtp,
  verifyEmailOtp,
} from "../sync/cloudSync.js";

type CloudUiState = {
  email: string;
  code: string;
  busy: boolean;
  notice: string | null;
  signedInEmail: string | null;
};

export async function renderCloudView(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  state: CloudUiState,
  onState: (patch: Partial<CloudUiState>) => void,
  onBack: () => void,
  options?: { embedded?: boolean },
): Promise<void> {
  const embedded = options?.embedded ?? false;
  setScreenChrome(screen, "split");

  const cloudOk = Boolean(me.supabaseUrl && me.supabaseAnonKey);
  const isPro = me.tier === "pro";
  const linked = Boolean(state.signedInEmail);

  let body: string;
  if (!isPro) {
    body = `<p class="muted">${t.cloudProOnly}</p>`;
  } else if (!cloudOk) {
    body = `<p class="muted">${t.cloudNotConfigured}</p>`;
  } else if (linked && state.signedInEmail) {
    body = `
      <div class="cloud-panel">
        <p class="cloud-status">${t.cloudSignedIn(state.signedInEmail)}</p>
        ${state.notice ? `<p class="notice">${escapeHtml(state.notice)}</p>` : ""}
        <button type="button" class="cloud-btn cloud-btn--sync" data-act="sync" ${state.busy ? "disabled" : ""}>
          <span class="material-symbols-outlined" aria-hidden="true">sync</span>
          <span>${state.busy ? t.cloudSyncing : t.cloudSyncNow}</span>
        </button>
        <button type="button" class="cloud-btn cloud-btn--signout" data-act="signout" ${state.busy ? "disabled" : ""}>
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>
          <span>${t.cloudSignOut}</span>
        </button>
      </div>
    `;
  } else {
    body = `
      <div class="cloud-panel cloud-panel--login">
        <p class="field-hint">${t.cloudSignInHint}</p>
        ${state.notice ? `<p class="notice">${escapeHtml(state.notice)}</p>` : ""}
        <label class="field-label">${t.cloudEmail}
          <input type="email" autocomplete="email" data-field="email" value="${escapeAttr(state.email)}" />
        </label>
        <button type="button" class="cloud-btn cloud-btn--secondary" data-act="send" ${state.busy ? "disabled" : ""}>
          <span class="material-symbols-outlined" aria-hidden="true">mail</span>
          <span>${t.cloudSendCode}</span>
        </button>
        <label class="field-label">${t.cloudCode}
          <input type="text" inputmode="numeric" autocomplete="one-time-code" data-field="code" value="" />
        </label>
        <button type="button" class="cloud-btn cloud-btn--primary" data-act="verify" ${state.busy ? "disabled" : ""}>
          <span class="material-symbols-outlined" aria-hidden="true">login</span>
          <span>${t.cloudVerify}</span>
        </button>
      </div>
    `;
  }

  let dock: string | undefined;
  if (!embedded) {
    const insideMax = isOpenedInsideMax();
    dock = insideMax
      ? `<button type="button" class="cloud-btn cloud-btn--ghost" data-act="back">
      <span class="material-symbols-outlined" aria-hidden="true">close</span>
      <span>${t.cloudClose}</span>
    </button>`
      : `<p class="muted cloud-browser-hint">${t.cloudBrowserHint}</p>`;
  }

  screen.innerHTML = splitLayout(`<h1 class="screen-title">${t.cloudTitle}</h1>`, body, dock);

  screen.querySelector('[data-act="back"]')?.addEventListener("click", (ev) => {
    ev.preventDefault();
    closeMaxWebApp();
    onBack();
  });

  if (!isPro || !cloudOk) return;

  const supabase = getSupabase(me.supabaseUrl!, me.supabaseAnonKey!);

  if (!linked) {
    const emailInput = screen.querySelector<HTMLInputElement>('[data-field="email"]');
    const codeInput = screen.querySelector<HTMLInputElement>('[data-field="code"]');
    // Не вызываем onState на input — иначе полный перерендер и клавиатура закрывается на каждом символе.

    screen.querySelector('[data-act="send"]')?.addEventListener("click", () => {
      void (async () => {
        const email = emailInput?.value.trim() ?? state.email.trim();
        if (!email) {
          onState({ notice: t.cloudEmailRequired });
          return;
        }
        onState({ busy: true, notice: null, email, code: "" });
        try {
          await sendEmailOtp(supabase, email);
          onState({ busy: false, notice: t.cloudCodeSent(email), email });
        } catch (err) {
          onState({
          busy: false,
          notice:
            err instanceof Error && err.message === "supabase_no_session" ? t.cloudNoSession : t.cloudError(err),
        });
        }
      })();
    });

    screen.querySelector('[data-act="verify"]')?.addEventListener("click", () => {
      void (async () => {
        const email = emailInput?.value.trim() ?? state.email.trim();
        const code = (codeInput?.value ?? "").trim();
        if (!email || !code) {
          onState({ notice: t.cloudCodeRequired });
          return;
        }
        onState({ busy: true, notice: null });
        try {
          const { data } = await verifyEmailOtp(supabase, email, code);
          const signed = data.user?.email ?? email;
          onState({ busy: false, signedInEmail: signed, notice: null });
        } catch (err) {
          onState({
          busy: false,
          notice:
            err instanceof Error && err.message === "supabase_no_session" ? t.cloudNoSession : t.cloudError(err),
        });
        }
      })();
    });
    return;
  }

  screen.querySelector('[data-act="sync"]')?.addEventListener("click", () => {
    void (async () => {
      onState({ busy: true, notice: null });
      try {
        const result = await runCloudSync(supabase);
        onState({ busy: false, notice: t.cloudSyncOk(result) });
      } catch (err) {
        onState({
          busy: false,
          notice:
            err instanceof Error && err.message === "supabase_no_session" ? t.cloudNoSession : t.cloudError(err),
        });
      }
    })();
  });

  screen.querySelector('[data-act="signout"]')?.addEventListener("click", () => {
    void (async () => {
      onState({ busy: true, notice: null });
      try {
        await supabase.auth.signOut();
        onState({ busy: false, signedInEmail: null, code: "", notice: t.cloudSignedOut });
      } catch (err) {
        onState({
          busy: false,
          notice:
            err instanceof Error && err.message === "supabase_no_session" ? t.cloudNoSession : t.cloudError(err),
        });
      }
    })();
  });
}

export async function refreshCloudSession(
  me: MeResponse,
  onSignedIn: (email: string | null) => void,
): Promise<void> {
  if (!me.supabaseUrl || !me.supabaseAnonKey || me.tier !== "pro") {
    onSignedIn(null);
    return;
  }
  const supabase = getSupabase(me.supabaseUrl, me.supabaseAnonKey);
  const { data } = await supabase.auth.getSession();
  onSignedIn(data.session?.user.email ?? null);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}