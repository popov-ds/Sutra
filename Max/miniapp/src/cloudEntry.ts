import "../styles.css";
import { mountCloudApp } from "./cloudShell.js";
import { initMaxWebApp } from "./maxBridge.js";

const screen = document.getElementById("screen")!;

initMaxWebApp();
mountCloudApp(screen).catch((err) => {
  screen.innerHTML = `<p class="muted">Ошибка: ${String(err)}</p>`;
});