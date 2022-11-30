import { observe } from "mobx";
import { DEFAULT_THEME } from "revolt-toolset";
import { Client } from "revolt.js";
import { ServerOrder } from "State";
import { writable } from "svelte/store";
import { Theme } from "Theme";
import { NotifSettings } from "./State";

export const client = new Client({
  unreads: true,
});
export const UnreadState = writable(Date.now());
client.once("ready", async () => {
  try {
    const settings = await client.syncFetchSettings([
      "theme",
      "appearance",
      "locale",
      "notifications",
      "ordering",
      "changelog",
    ]);
    ServerOrder.set(JSON.parse(settings.ordering[1]).servers);
    NotifSettings.set(JSON.parse(settings.notifications[1]) || {});
    const theme = JSON.parse(settings.theme[1])["appearance:theme:overrides"] || {};
    Theme.set({ ...DEFAULT_THEME, ...theme });
    localStorage.setItem("theme", JSON.stringify(theme));
  } catch (err) {
    console.error(err);
  }
});

if (client.unreads) {
  observe(client.unreads, () => {
    UnreadState.set(Date.now());
  });
  setInterval(() => client.unreads?.sync(), 60000);
}
