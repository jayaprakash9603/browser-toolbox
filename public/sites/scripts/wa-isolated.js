(function() {
	//#region src/core/sites/whatsapp/constants.ts
	var PAGE_CMD_KEY = "__toolboxWaCmd";
	//#endregion
	//#region src/chrome/content/sites/whatsapp/bridge.ts
	function postToMain(command, payload) {
		window.postMessage({
			[PAGE_CMD_KEY]: command,
			payload
		}, location.origin || "*");
	}
	//#endregion
	//#region src/core/sites/whatsapp/features.ts
	function toggles(section, ids, opts) {
		const impl = opts?.impl ?? "css";
		const defaultVal = opts?.default ?? false;
		return ids.map((id) => ({
			id,
			section,
			kind: "toggle",
			impl,
			default: defaultVal,
			...opts?.bestEffort ? { bestEffort: true } : {}
		}));
	}
	var WHATSAPP_FEATURES = [
		...toggles("privacy", [
			"blurContactNames",
			"blurContactPhotos",
			"blurRecentMessages",
			"blurConversationMessages",
			"blurComposer"
		]),
		...toggles("privacy", [
			"hideTyping",
			"hideRecording",
			"viewStatusPrivately",
			"playAudioPrivately",
			"disableReadReceipts",
			"invisibleMode"
		], {
			impl: "script",
			bestEffort: true
		}),
		{
			id: "restoreDeletedMessages",
			section: "privacy",
			kind: "toggle",
			impl: "script",
			default: false
		},
		...toggles("custom", [
			"notifyOnline",
			"notifyTyping",
			"preventListJump"
		], { impl: "script" }),
		{
			id: "customChatBackground",
			section: "custom",
			kind: "toggle",
			impl: "style",
			default: false
		},
		{
			id: "showSideLauncher",
			section: "custom",
			kind: "toggle",
			impl: "script",
			default: true
		},
		...toggles("buttons", [
			"btnLike",
			"btnPinChat",
			"btnStartChat",
			"btnMarkRead",
			"btnTranslate",
			"btnTranscribe",
			"btnDownloadStatus",
			"btnChatInfo",
			"btnQuickReply",
			"btnAddTask",
			"btnSaveContact"
		], { impl: "script" }),
		{
			id: "whisperApiKey",
			section: "buttons",
			kind: "text",
			impl: "script",
			default: ""
		}
	];
	new Map(WHATSAPP_FEATURES.map((f) => [f.id, f]));
	var CSS_FEATURE_IDS = WHATSAPP_FEATURES.filter((f) => f.impl === "css").map((f) => f.id);
	WHATSAPP_FEATURES.filter((f) => f.impl === "script").map((f) => f.id);
	//#endregion
	//#region src/core/sites/whatsapp/helpers.ts
	function featureAttrName(id) {
		return `data-tbx-wa-${id.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
	}
	function isFeatureOn(values, id) {
		return values[id] === true;
	}
	//#endregion
	//#region src/core/i18n/chromeMessages.ts
	var CHROME_UI_FALLBACKS = {
		extName: "Browser Toolbox",
		extDescription: "All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.",
		actionTitle: "Open Browser Toolbox",
		contextMenuOpen: "Open Browser Toolbox",
		contextMenuPauseAdblock: "Pause ad blocking on this site"
	};
	function getChromeMessage(messageName) {
		try {
			if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
				const value = chrome.i18n.getMessage(messageName);
				if (value) return value;
			}
		} catch {}
		return CHROME_UI_FALLBACKS[messageName] ?? "";
	}
	function getExtensionName() {
		return getChromeMessage("extName") || CHROME_UI_FALLBACKS.extName;
	}
	getExtensionName();
	function defaultWhatsappValues() {
		const values = {};
		for (const f of WHATSAPP_FEATURES) values[f.id] = f.default;
		return values;
	}
	defaultWhatsappValues();
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/buttons.ts
	var observer = null;
	function injectHeaderButtons(state) {
		const header = document.querySelector("[data-testid=\"conversation-header\"]");
		if (!header || header.querySelector(".tbx-wa-header-actions")) return;
		const wrap = document.createElement("div");
		wrap.className = "tbx-wa-header-actions";
		wrap.style.display = "flex";
		wrap.style.alignItems = "center";
		const add = (label, title, onClick) => {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "tbx-wa-extra-btn";
			b.title = title;
			b.textContent = label;
			b.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick();
			});
			wrap.appendChild(b);
		};
		const v = state.values;
		if (isFeatureOn(v, "btnMarkRead")) add("✓", "Mark read/unread", () => postToMain("toggleRead", {}));
		if (isFeatureOn(v, "btnPinChat")) add("📌", "Pin chat", () => postToMain("pinChat", {}));
		if (isFeatureOn(v, "btnChatInfo")) add("ℹ", "Chat info", () => postToMain("chatInfo", {}));
		if (isFeatureOn(v, "btnStartChat")) add("💬", "Start chat", () => {
			const num = prompt("Phone number (with country code):");
			if (num) postToMain("startChat", { number: num });
		});
		if (isFeatureOn(v, "btnQuickReply")) add("⚡", "Quick reply", () => postToMain("openQuickReply", {}));
		if (isFeatureOn(v, "btnAddTask")) add("✓+", "Add task", () => postToMain("addTask", {}));
		header.appendChild(wrap);
	}
	function injectMessageButtons(state) {
		const v = state.values;
		if (!isFeatureOn(v, "btnLike") && !isFeatureOn(v, "btnTranslate") && !isFeatureOn(v, "btnTranscribe")) return;
		document.querySelectorAll("[data-testid=\"msg-container\"]:not([data-tbx-wa-btn])").forEach((row) => {
			row.setAttribute("data-tbx-wa-btn", "1");
			const bar = document.createElement("span");
			bar.style.display = "inline-flex";
			bar.style.marginLeft = "4px";
			if (isFeatureOn(v, "btnLike")) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "tbx-wa-extra-btn";
				b.textContent = "👍";
				b.title = "Like";
				b.addEventListener("click", () => postToMain("likeMessage", { el: row.outerHTML.slice(0, 200) }));
				bar.appendChild(b);
			}
			if (isFeatureOn(v, "btnTranslate")) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "tbx-wa-extra-btn";
				b.textContent = "🌐";
				b.title = "Translate";
				const text = row.querySelector(".selectable-text")?.textContent ?? "";
				b.addEventListener("click", () => postToMain("translateMessage", { text }));
				bar.appendChild(b);
			}
			row.appendChild(bar);
		});
	}
	function startButtons(state) {
		stopButtons();
		const scan = () => {
			injectHeaderButtons(state);
			injectMessageButtons(state);
		};
		scan();
		const root = document.querySelector("#app") ?? document.body;
		observer = new MutationObserver(() => scan());
		observer.observe(root, {
			childList: true,
			subtree: true
		});
	}
	function stopButtons() {
		observer?.disconnect();
		observer = null;
		document.querySelectorAll(".tbx-wa-header-actions").forEach((el) => el.remove());
		document.querySelectorAll("[data-tbx-wa-btn]").forEach((el) => el.removeAttribute("data-tbx-wa-btn"));
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/custom.ts
	var LAUNCHER_ID = "tbx-wa-launcher";
	var RAIL_MAX_X = 100;
	var REMOUNT_DEBOUNCE_MS = 250;
	var PLUS_SVG = "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"currentColor\"/><path d=\"M12 7v10M7 12h10\" stroke=\"#fff\" stroke-width=\"2.4\" stroke-linecap=\"round\"/></svg>";
	var launcherItem = null;
	var railObserver = null;
	var remountTimer = null;
	/** Buttons in the narrow left navigation rail; label text is localized, so match on position. */
	function railButtons() {
		const out = [];
		for (const el of document.querySelectorAll("button, [role=\"button\"]")) {
			if (el.closest(`#${LAUNCHER_ID}`)) continue;
			const r = el.getBoundingClientRect();
			if (r.width < 20 || r.width > 90 || r.height < 20 || r.height > 90) continue;
			if (r.right > RAIL_MAX_X) continue;
			out.push(el);
		}
		return out;
	}
	/** The rail item wrapping `button`: the highest ancestor that holds no other rail button. */
	function railItemFor(button, all) {
		let item = button;
		while (item.parentElement) {
			const parent = item.parentElement;
			if (all.some((b) => b !== button && parent.contains(b))) break;
			item = parent;
		}
		return item;
	}
	/** Last button in the top group of the rail (Meta AI today); bottom buttons are media/profile. */
	function findAnchorItem() {
		const buttons = railButtons();
		const topHalf = buttons.filter((b) => b.getBoundingClientRect().top < window.innerHeight / 2);
		if (topHalf.length < 3) return null;
		topHalf.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
		return railItemFor(topHalf[topHalf.length - 1], buttons);
	}
	function createItem(anchor) {
		const item = document.createElement(anchor.tagName);
		item.id = LAUNCHER_ID;
		item.className = anchor.className;
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "tbx-wa-launcher";
		btn.title = "Browser Toolbox";
		btn.setAttribute("aria-label", "Browser Toolbox");
		btn.innerHTML = PLUS_SVG;
		btn.addEventListener("click", () => {
			chrome.runtime.sendMessage({ type: "WA_OPEN_PANEL" }).catch(() => {});
		});
		item.appendChild(btn);
		return item;
	}
	function ensureLauncher() {
		if (launcherItem?.isConnected) return;
		const anchor = findAnchorItem();
		if (!anchor) return;
		launcherItem?.remove();
		launcherItem = createItem(anchor);
		anchor.insertAdjacentElement("afterend", launcherItem);
	}
	function scheduleEnsure() {
		if (remountTimer) return;
		remountTimer = setTimeout(() => {
			remountTimer = null;
			ensureLauncher();
		}, REMOUNT_DEBOUNCE_MS);
	}
	function mountLauncher(enabled) {
		if (!enabled) {
			railObserver?.disconnect();
			railObserver = null;
			if (remountTimer) clearTimeout(remountTimer);
			remountTimer = null;
			launcherItem?.remove();
			launcherItem = null;
			document.getElementById(LAUNCHER_ID)?.remove();
			return;
		}
		ensureLauncher();
		if (!railObserver) {
			railObserver = new MutationObserver(() => {
				if (!launcherItem?.isConnected) scheduleEnsure();
			});
			railObserver.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		}
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/index.ts
	function startScriptFeatures(ctx) {
		stopScriptFeatures();
		if (!ctx.state.enabled) return;
		const v = ctx.state.values;
		postToMain("syncState", {
			values: v,
			data: ctx.state.data
		});
		mountLauncher(isFeatureOn(v, "showSideLauncher"));
		startButtons(ctx.state);
	}
	function stopScriptFeatures() {
		postToMain("syncState", null);
		stopButtons();
		mountLauncher(false);
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/manager.ts
	var STYLE_LINK_ID = "toolbox-wa-css";
	var ACTIVE_ATTR = "data-tbx-wa-active";
	function applyCssFeatures(state) {
		const root = document.documentElement;
		root.setAttribute(ACTIVE_ATTR, "true");
		for (const id of CSS_FEATURE_IDS) if (state.values[id] === true) root.setAttribute(featureAttrName(id), "true");
		else root.removeAttribute(featureAttrName(id));
		if (isFeatureOn(state.values, "preventListJump")) root.setAttribute(featureAttrName("preventListJump"), "true");
		else root.removeAttribute(featureAttrName("preventListJump"));
	}
	function applyChatBackground(state) {
		const root = document.documentElement;
		const main = document.querySelector("#main");
		const on = isFeatureOn(state.values, "customChatBackground");
		const url = state.data.chatBackgroundDataUrl;
		if (on && url && url.length < 5e5) {
			root.setAttribute(featureAttrName("customChatBackground"), "true");
			if (main) main.style.backgroundImage = `url("${url.replace(/"/g, "")}")`;
		} else {
			root.removeAttribute(featureAttrName("customChatBackground"));
			if (main) main.style.removeProperty("background-image");
		}
	}
	function ensureCssLink() {
		if (document.getElementById(STYLE_LINK_ID)) return;
		const link = document.createElement("link");
		link.id = STYLE_LINK_ID;
		link.rel = "stylesheet";
		link.href = chrome.runtime.getURL("sites/whatsapp/whatsapp.css");
		document.head.appendChild(link);
	}
	function applyWhatsappPlus(state) {
		if (!state.enabled) {
			stopAll();
			return;
		}
		ensureCssLink();
		applyCssFeatures(state);
		applyChatBackground(state);
		startScriptFeatures({ state });
	}
	function stopAll() {
		stopScriptFeatures();
		const root = document.documentElement;
		for (const attr of [...root.attributes]) if (attr.name.startsWith("data-tbx-wa-")) root.removeAttribute(attr.name);
		document.getElementById(STYLE_LINK_ID)?.remove();
		document.querySelectorAll("#tbx-wa-launcher, .tbx-wa-launcher, .tbx-wa-extra-btn, .tbx-wa-restored-msg").forEach((el) => el.remove());
		const main = document.querySelector("#main");
		if (main) main.style.removeProperty("background-image");
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/isolated.ts
	function readState(raw) {
		if (!raw || typeof raw !== "object") return null;
		const o = raw;
		if (!o.values || !o.data) return null;
		return o;
	}
	function apply(raw) {
		const state = readState(raw);
		if (!state?.enabled) {
			stopAll();
			return;
		}
		applyWhatsappPlus(state);
	}
	function showRestored(body) {
		const main = document.querySelector("#main [data-testid=\"conversation-panel-messages\"]");
		if (!main) return;
		const el = document.createElement("div");
		el.className = "tbx-wa-restored-msg";
		el.textContent = `Deleted: ${body}`;
		main.appendChild(el);
	}
	var guarded = window;
	if (!guarded.__toolboxWaEnhancer) {
		guarded.__toolboxWaEnhancer = true;
		if (window === window.top) {
			chrome.storage.local.get("whatsappPlus", (result) => apply(result.whatsappPlus));
			chrome.storage.onChanged.addListener((changes, area) => {
				if (area === "local" && changes.whatsappPlus) apply(changes.whatsappPlus.newValue);
			});
			chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
				if (msg?.type === "WA_SHOW_RESTORED" && msg.body) showRestored(String(msg.body));
				if (msg?.type === "WA_SEND_TEXT" && msg.chatId && msg.text) postToMain("sendText", {
					chatId: msg.chatId,
					text: msg.text
				});
				if (msg?.type === "WA_EXPORT" && msg.kind) {
					const kind = String(msg.kind);
					const onResult = (event, payload) => {
						if (event !== "exportResult") return;
						window.removeEventListener("message", listener);
						sendResponse({
							ok: true,
							rows: payload
						});
					};
					const listener = (e) => {
						if (e.source !== window) return;
						const data = e.data;
						if (data && data["__toolboxWaEvt"] === "exportResult") onResult("exportResult", data.payload);
					};
					window.addEventListener("message", listener);
					postToMain("export", { kind });
					setTimeout(() => sendResponse({
						ok: false,
						rows: []
					}), 8e3);
					return true;
				}
			});
			chrome.runtime.sendMessage({ type: "WA_GET_STATUS" }).catch(() => {});
		}
	}
	//#endregion
})();
