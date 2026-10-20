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
	var reqSeq = 0;
	/** Sends `query` to the main world and resolves with its `queryResult` rows (empty on timeout). */
	function queryMain(kind, timeoutMs = 15e3) {
		const reqId = `q${Date.now()}_${++reqSeq}`;
		return new Promise((resolve) => {
			const finish = (rows) => {
				window.removeEventListener("message", listener);
				clearTimeout(timer);
				resolve(rows);
			};
			const listener = (e) => {
				if (e.source !== window) return;
				const data = e.data;
				if (!data || data["__toolboxWaEvt"] !== "queryResult") return;
				const p = data.payload;
				if (p?.reqId === reqId) finish(Array.isArray(p.rows) ? p.rows : []);
			};
			const timer = setTimeout(() => finish([]), timeoutMs);
			window.addEventListener("message", listener);
			postToMain("query", {
				kind,
				reqId
			});
		});
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
	function countActiveFeatures(state) {
		if (!state.enabled) return 0;
		let n = 0;
		for (const [id, v] of Object.entries(state.values)) {
			if (v === true) n++;
			if (typeof v === "string" && v.trim() && !id.endsWith("ApiKey")) n++;
		}
		return n;
	}
	/** Replace `{name}`, `{date}`, `{time}` in template bodies */
	function applyTemplateVariables(body, vars) {
		const now = /* @__PURE__ */ new Date();
		const date = vars.date ?? now.toLocaleDateString();
		const time = vars.time ?? now.toLocaleTimeString();
		const name = vars.name ?? "";
		return body.replace(/\{name\}/gi, name).replace(/\{date\}/gi, date).replace(/\{time\}/gi, time);
	}
	function contactsToCsv(rows) {
		if (!rows.length) return "";
		const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
		const esc = (v) => `"${v.replace(/"/g, "\"\"")}"`;
		const lines = [keys.join(",")];
		for (const row of rows) lines.push(keys.map((k) => esc(row[k] ?? "")).join(","));
		return lines.join("\n");
	}
	//#endregion
	//#region src/core/sites/whatsapp/labels.ts
	var WHATSAPP_FEATURE_LABELS = {
		blurContactNames: {
			label: "Blur contact names",
			description: "Hide chat names until you hover them."
		},
		blurContactPhotos: {
			label: "Blur contact photos",
			description: "Hide profile pictures until you hover them."
		},
		blurRecentMessages: {
			label: "Blur recent messages",
			description: "Hide message previews in the chat list."
		},
		blurConversationMessages: {
			label: "Blur conversation messages",
			description: "Hide message bubbles until you hover them."
		},
		blurComposer: {
			label: "Blur message composer input",
			description: "Hide what you type until the box is focused."
		},
		hideTyping: {
			label: "Hide typing status",
			description: "Others will not see \"typing…\"."
		},
		hideRecording: {
			label: "Hide recording status",
			description: "Others will not see \"recording audio…\"."
		},
		viewStatusPrivately: {
			label: "View statuses privately",
			description: "Watch statuses without sending a view receipt."
		},
		playAudioPrivately: {
			label: "Play audio messages privately",
			description: "Play voice notes without marking them played."
		},
		disableReadReceipts: {
			label: "Disable read receipts",
			description: "Read messages without blue ticks."
		},
		invisibleMode: {
			label: "Hide online status (Invisible Mode)",
			description: "Appear offline while using WhatsApp."
		},
		restoreDeletedMessages: {
			label: "Restore deleted messages",
			description: "Keep a copy of messages deleted for everyone."
		},
		notifyOnline: {
			label: "Notify about online activities",
			description: "Get a notification when a contact comes online."
		},
		notifyTyping: {
			label: "Notify about typing and recording activities",
			description: "Get a notification when someone is typing."
		},
		preventListJump: {
			label: "Prevent chats list jumping on message submission",
			description: "Keep the chat list scroll position."
		},
		customChatBackground: {
			label: "Set custom chat background image",
			description: "Use your own wallpaper for conversations."
		},
		showSideLauncher: {
			label: "Show WA Web Plus button in sidebar",
			description: "Green plus button in the left navigation rail."
		},
		btnLike: {
			label: "Like button",
			description: "Quick 👍 reaction on message hover."
		},
		btnPinChat: {
			label: "Pin chat button",
			description: "Pin the open chat from its header."
		},
		btnStartChat: {
			label: "Start new chat",
			description: "Open a chat with any phone number."
		},
		btnMarkRead: {
			label: "Mark conversation as read/unread",
			description: "Toggle unread state from the chat header."
		},
		btnTranscribe: {
			label: "Transcribe audio messages button",
			description: "Convert voice notes to text (Whisper API key)."
		},
		btnTranslate: {
			label: "Translate message button",
			description: "Translate a message on hover."
		},
		btnDownloadStatus: {
			label: "Download status button",
			description: "Save status photos and videos."
		},
		btnChatInfo: {
			label: "Chat info button",
			description: "Show details about the open chat."
		},
		btnQuickReply: {
			label: "Quick reply buttons",
			description: "Insert a template from the chat header."
		},
		btnAddTask: {
			label: "Add task button",
			description: "Create a task from the open chat."
		},
		btnSaveContact: {
			label: "Save contact button",
			description: "Save an unknown number as a contact."
		},
		whisperApiKey: {
			label: "Whisper API key",
			description: "OpenAI key used for audio transcription."
		}
	};
	var WHATSAPP_SECTION_INFO = {
		privacy: {
			label: "Private Mode",
			description: "Anti screen and status spying"
		},
		custom: {
			label: "Customizations",
			description: "Other different useful functions"
		},
		buttons: {
			label: "Extra Buttons",
			description: "Add new buttons with additional functions"
		}
	};
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
	//#endregion
	//#region src/core/sites/whatsapp/service.ts
	function defaultWhatsappData() {
		return {
			templates: [],
			smartReplies: [],
			scheduled: [],
			tasks: [],
			campaigns: [],
			webhooks: [],
			whisperApiKey: "",
			chatBackgroundDataUrl: ""
		};
	}
	function defaultWhatsappValues() {
		const values = {};
		for (const f of WHATSAPP_FEATURES) values[f.id] = f.default;
		return values;
	}
	defaultWhatsappValues();
	//#endregion
	//#region src/core/sites/whatsapp/types.ts
	var WHATSAPP_SECTIONS = [
		"privacy",
		"custom",
		"buttons"
	];
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
			if (row.querySelector(":scope > .tbx-wa-msg-actions")) return;
			const msgId = row.closest("[data-id]")?.getAttribute("data-id") ?? "";
			const bar = document.createElement("span");
			bar.className = "tbx-wa-msg-actions";
			if (isFeatureOn(v, "btnLike") && msgId) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "tbx-wa-extra-btn";
				b.textContent = "👍";
				b.title = "React 👍";
				b.addEventListener("click", (e) => {
					e.stopPropagation();
					postToMain("likeMessage", { msgId });
				});
				bar.appendChild(b);
			}
			if (isFeatureOn(v, "btnTranslate")) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "tbx-wa-extra-btn";
				b.textContent = "🌐";
				b.title = "Translate";
				const text = row.querySelector(".selectable-text")?.textContent ?? "";
				b.addEventListener("click", (e) => {
					e.stopPropagation();
					postToMain("translateMessage", { text });
				});
				bar.appendChild(b);
			}
			if (bar.childElementCount) row.appendChild(bar);
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
		document.querySelectorAll(".tbx-wa-header-actions, .tbx-wa-msg-actions").forEach((el) => el.remove());
		document.querySelectorAll("[data-tbx-wa-btn]").forEach((el) => el.removeAttribute("data-tbx-wa-btn"));
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/drawer.ts
	var STORAGE_KEY = "whatsappPlus";
	var DRAWER_ID = "tbx-wa-drawer";
	var OPEN_ATTR = "data-tbx-wa-drawer-open";
	var BULK_EXCLUDED = /* @__PURE__ */ new Set(["showSideLauncher"]);
	var ICONS = {
		tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
		dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
		download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
		chart: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
		more: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
		back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
		close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
		chevron: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
		template: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z",
		broadcast: "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
		reply: "M7 8V5l-7 7 7 7v-3l-4-4 4-4zm6 1V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
		schedule: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
		tasks: "M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM5.54 11 2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z",
		webhook: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
		person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
		group: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
		label: "M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z",
		flag: "M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z",
		delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
		add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
		refresh: "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
		open: "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
		power: "M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z",
		hide: "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
		send: "M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
	};
	var VIEW_TITLES = {
		home: "WA Web Plus",
		enhancements: "Enhancements",
		business: "Business Tools",
		templates: "Message Templates",
		smartReplies: "Smart Replies",
		scheduled: "Scheduled Messages",
		tasks: "Tasks",
		webhooks: "Webhooks and API",
		export: "Exporting",
		stats: "Statistics",
		more: "More"
	};
	var drawer = null;
	var bodyEl = null;
	var footerEl = null;
	var toastTimer = null;
	var state = null;
	var stack = ["home"];
	var listenersBound = false;
	var exportKind = "contacts_all";
	var formOpen = false;
	function icon(name, size = 24) {
		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", String(size));
		svg.setAttribute("height", String(size));
		svg.setAttribute("aria-hidden", "true");
		const path = document.createElementNS(ns, "path");
		path.setAttribute("d", ICONS[name]);
		path.setAttribute("fill", "currentColor");
		svg.appendChild(path);
		return svg;
	}
	function el(tag, cls, ...children) {
		const node = document.createElement(tag);
		if (cls) node.className = cls;
		for (const c of children) {
			if (c === null || c === void 0 || c === false) continue;
			node.append(c);
		}
		return node;
	}
	function iconButton(name, title, onClick) {
		const b = el("button", "tbx-d-iconbtn", icon(name));
		b.type = "button";
		b.title = title;
		b.setAttribute("aria-label", title);
		b.addEventListener("click", (e) => {
			e.stopPropagation();
			onClick();
		});
		return b;
	}
	function textButton(label, onClick, variant = "primary") {
		const b = el("button", `tbx-d-btn tbx-d-btn--${variant}`, label);
		b.type = "button";
		b.addEventListener("click", onClick);
		return b;
	}
	function switchEl(checked, onChange, label) {
		const b = el("button", "tbx-d-switch");
		b.type = "button";
		b.setAttribute("role", "switch");
		b.setAttribute("aria-checked", String(checked));
		b.setAttribute("aria-label", label);
		b.addEventListener("click", (e) => {
			e.stopPropagation();
			onChange(b.getAttribute("aria-checked") !== "true");
		});
		return b;
	}
	function checkbox(checked, onChange) {
		const input = el("input", "tbx-d-check");
		input.type = "checkbox";
		input.checked = checked;
		input.addEventListener("change", () => onChange(input.checked));
		return input;
	}
	function input(placeholder, type = "text") {
		const i = el("input", "tbx-d-input");
		i.type = type;
		i.placeholder = placeholder;
		return i;
	}
	function uid() {
		return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
	}
	function normalize(raw) {
		const o = raw && typeof raw === "object" ? raw : {};
		return {
			enabled: o.enabled ?? false,
			values: {
				...defaultWhatsappValues(),
				...o.values
			},
			data: {
				...defaultWhatsappData(),
				...o.data
			}
		};
	}
	async function loadState() {
		return normalize((await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]);
	}
	async function patchState(patch) {
		const cur = await loadState();
		const next = {
			enabled: patch.enabled ?? cur.enabled,
			values: {
				...cur.values,
				...patch.values
			},
			data: {
				...cur.data,
				...patch.data
			}
		};
		state = next;
		await chrome.storage.local.set({ [STORAGE_KEY]: next });
		render("none");
	}
	function toast(message) {
		if (!drawer) return;
		drawer.querySelector(".tbx-d-toast")?.remove();
		const t = el("div", "tbx-d-toast", message);
		drawer.appendChild(t);
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => t.remove(), 2600);
	}
	function openFullPanel() {
		chrome.runtime.sendMessage({ type: "WA_OPEN_PANEL" }).catch(() => {});
	}
	function activeChatTitle() {
		return document.querySelector("#main header span[dir=\"auto\"]")?.textContent?.trim() ?? "";
	}
	function insertIntoComposer(text) {
		const box = document.querySelector("#main footer [contenteditable=\"true\"]");
		if (!box) return false;
		box.focus();
		document.execCommand("insertText", false, text);
		return true;
	}
	function downloadCsv(name, rows) {
		const blob = new Blob([`\ufeff${contactsToCsv(rows)}`], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = el("a");
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function listColumn() {
		const side = document.querySelector("#side");
		if (!side) return null;
		let col = side;
		while (col.parentElement && col.parentElement !== document.body) {
			const pr = col.parentElement.getBoundingClientRect();
			if (Math.abs(pr.width - col.getBoundingClientRect().width) > 2) break;
			col = col.parentElement;
		}
		const r = col.getBoundingClientRect();
		return r.width > 200 ? r : null;
	}
	function position() {
		if (!drawer) return;
		const col = listColumn();
		const launcher = document.getElementById("tbx-wa-launcher");
		const railRight = launcher ? launcher.getBoundingClientRect().right : 64;
		const left = col ? col.left : railRight;
		const top = col ? col.top : 0;
		const width = col ? col.width : Math.min(440, Math.max(340, window.innerWidth * .3));
		const height = col ? col.height : window.innerHeight;
		Object.assign(drawer.style, {
			left: `${Math.round(left)}px`,
			top: `${Math.round(top)}px`,
			width: `${Math.round(width)}px`,
			height: `${Math.round(height)}px`
		});
	}
	function navRow(iconName, title, subtitle, onClick, trailing) {
		const row = el("button", "tbx-d-nav", el("span", "tbx-d-nav__icon", icon(iconName)), el("span", "tbx-d-nav__text", el("span", "tbx-d-nav__title", title), el("span", "tbx-d-nav__sub", subtitle)), trailing ?? null);
		row.type = "button";
		row.addEventListener("click", onClick);
		return row;
	}
	function heading(title, actions) {
		return el("div", "tbx-d-heading", iconButton("back", "Back", goBack), el("h2", "tbx-d-heading__title", title), actions ? el("div", "tbx-d-heading__actions", actions) : null);
	}
	function emptyState(text) {
		return el("p", "tbx-d-empty", text);
	}
	function viewHome() {
		const s = state;
		return el("div", "tbx-d-list", navRow("tune", "Enhancements", "Enhance your WhatsApp privacy and productivity.", () => go("enhancements")), navRow("dashboard", "Business Tools", "Accelerate daily tasks with smart business solutions.", () => go("business")), navRow("download", "Exporting", "Easily save and manage your WhatsApp data.", () => go("export")), navRow("chart", "Statistics", "Gain valuable insights from your data.", () => go("stats")), navRow("more", "More…", "Open the full panel, hide the button or turn off.", () => go("more")), el("p", "tbx-d-hint", `${countActiveFeatures(s)} features active`));
	}
	function sectionBlock(section) {
		const s = state;
		const info = WHATSAPP_SECTION_INFO[section];
		const items = WHATSAPP_FEATURES.filter((f) => f.section === section && f.kind === "toggle");
		const bulk = items.filter((f) => !BULK_EXCLUDED.has(f.id));
		const allOn = bulk.length > 0 && bulk.every((f) => s.values[f.id] === true);
		const list = el("div", "tbx-d-checks");
		for (const f of items) {
			const meta = WHATSAPP_FEATURE_LABELS[f.id];
			const row = el("label", "tbx-d-checkrow", checkbox(s.values[f.id] === true, (on) => void patchState({ values: { [f.id]: on } })), el("span", "tbx-d-checkrow__label", meta?.label ?? f.id));
			row.title = meta?.description ?? "";
			list.appendChild(row);
			if (f.id === "customChatBackground" && s.values[f.id] === true) list.appendChild(backgroundControls());
			if (f.id === "btnTranscribe" && s.values[f.id] === true) list.appendChild(whisperControls());
		}
		return el("section", "tbx-d-section", el("div", "tbx-d-section__head", el("div", "tbx-d-section__text", el("h3", "tbx-d-section__title", info.label), el("p", "tbx-d-section__sub", info.description)), switchEl(allOn, (on) => {
			const values = {};
			for (const f of bulk) values[f.id] = on;
			patchState({ values });
		}, info.label)), list);
	}
	function backgroundControls() {
		const file = el("input");
		file.type = "file";
		file.accept = "image/*";
		file.hidden = true;
		file.addEventListener("change", () => {
			const f = file.files?.[0];
			if (!f) return;
			const reader = new FileReader();
			reader.onload = () => {
				const url = String(reader.result ?? "");
				if (url.length >= 5e5) {
					toast("Image is too large. Pick a smaller one.");
					return;
				}
				patchState({ data: { chatBackgroundDataUrl: url } }).then(() => toast("Background updated"));
			};
			reader.readAsDataURL(f);
		});
		const hasImage = Boolean(state?.data.chatBackgroundDataUrl);
		return el("div", "tbx-d-subcontrols", file, textButton(hasImage ? "Change image" : "Choose image", () => file.click(), "ghost"), hasImage ? textButton("Remove", () => void patchState({ data: { chatBackgroundDataUrl: "" } }), "ghost") : null);
	}
	function whisperControls() {
		const key = input("OpenAI API key (sk-…)", "password");
		key.value = state?.data.whisperApiKey ?? "";
		key.addEventListener("change", () => {
			patchState({
				data: { whisperApiKey: key.value.trim() },
				values: { whisperApiKey: key.value.trim() }
			}).then(() => toast("API key saved"));
		});
		return el("div", "tbx-d-subcontrols", key);
	}
	function viewEnhancements() {
		return el("div", "tbx-d-view", heading("Enhancements"), ...WHATSAPP_SECTIONS.map(sectionBlock));
	}
	function countBadge(n) {
		return n > 0 ? el("span", "tbx-d-badge", String(n)) : null;
	}
	function viewBusiness() {
		const d = state.data;
		return el("div", "tbx-d-view", heading("Business Tools"), el("div", "tbx-d-list", navRow("template", "Message Templates", "Preset list of message templates.", () => go("templates"), countBadge(d.templates.length)), navRow("broadcast", "Broadcasting", "Run customized message campaigns.", () => {
			openFullPanel();
			toast("Broadcasting opens in the Browser Toolbox panel");
		}, countBadge(d.campaigns.length)), navRow("reply", "Smart Replies", "Setup automatic smart replies.", () => go("smartReplies"), countBadge(d.smartReplies.length)), navRow("schedule", "Scheduled Messages", "Send a message later at a set time.", () => go("scheduled"), countBadge(d.scheduled.filter((x) => x.status === "pending").length)), navRow("tasks", "Tasks", "Track your to-dos, follow-ups and reminders.", () => go("tasks"), countBadge(d.tasks.filter((t) => !t.done).length)), navRow("webhook", "Webhooks and API", "Integrate WhatsApp with third-party apps.", () => go("webhooks"), countBadge(d.webhooks.length))));
	}
	function formCard(...children) {
		return el("div", "tbx-d-form", ...children);
	}
	function addToggleAction() {
		return iconButton(formOpen ? "close" : "add", formOpen ? "Cancel" : "Add", () => {
			formOpen = !formOpen;
			render("none");
		});
	}
	function viewTemplates() {
		const d = state.data;
		const name = input("Template name");
		const body = el("textarea", "tbx-d-input tbx-d-textarea");
		body.placeholder = "Message… use {name}, {date}, {time}";
		body.rows = 4;
		const list = el("div", "tbx-d-cards");
		for (const t of d.templates) {
			const card = el("div", "tbx-d-card tbx-d-card--clickable", el("div", "tbx-d-card__main", el("div", "tbx-d-card__title", t.name), el("div", "tbx-d-card__body", t.body)), el("div", "tbx-d-card__actions", iconButton("send", "Insert into message box", () => useTemplate(t.body)), iconButton("delete", "Delete", () => void patchState({ data: { templates: d.templates.filter((x) => x.id !== t.id) } }))));
			card.addEventListener("click", () => useTemplate(t.body));
			list.appendChild(card);
		}
		return el("div", "tbx-d-view", heading("Message Templates", addToggleAction()), formOpen ? formCard(name, body, el("div", "tbx-d-form__actions", textButton("Save template", () => {
			if (!name.value.trim() || !body.value.trim()) return toast("Name and message are required");
			formOpen = false;
			patchState({ data: { templates: [...d.templates, {
				id: uid(),
				name: name.value.trim(),
				body: body.value,
				createdAt: Date.now()
			}] } });
		}))) : null, d.templates.length ? list : emptyState("No templates yet. Tap + to create one, then click it to insert into the open chat."));
	}
	function useTemplate(body) {
		if (insertIntoComposer(applyTemplateVariables(body, { name: activeChatTitle() }))) toast("Inserted into message box");
		else toast("Open a chat first");
	}
	function viewSmartReplies() {
		const d = state.data;
		const pattern = input("When a message contains…");
		const reply = el("textarea", "tbx-d-input tbx-d-textarea");
		reply.placeholder = "Reply with…";
		reply.rows = 3;
		let regex = false;
		const list = el("div", "tbx-d-cards");
		for (const r of d.smartReplies) list.appendChild(el("div", "tbx-d-card", el("div", "tbx-d-card__main", el("div", "tbx-d-card__title", r.isRegex ? `/${r.pattern}/` : `“${r.pattern}”`), el("div", "tbx-d-card__body", r.reply)), el("div", "tbx-d-card__actions", switchEl(r.enabled, (on) => void patchState({ data: { smartReplies: d.smartReplies.map((x) => x.id === r.id ? {
			...x,
			enabled: on
		} : x) } }), "Enabled"), iconButton("delete", "Delete", () => void patchState({ data: { smartReplies: d.smartReplies.filter((x) => x.id !== r.id) } })))));
		return el("div", "tbx-d-view", heading("Smart Replies", addToggleAction()), formOpen ? formCard(pattern, el("label", "tbx-d-checkrow", checkbox(false, (on) => regex = on), el("span", "tbx-d-checkrow__label", "Treat as regular expression")), reply, el("div", "tbx-d-form__actions", textButton("Save rule", () => {
			if (!pattern.value.trim() || !reply.value.trim()) return toast("Trigger and reply are required");
			formOpen = false;
			const rule = {
				id: uid(),
				name: pattern.value.trim(),
				pattern: pattern.value.trim(),
				isRegex: regex,
				reply: reply.value,
				enabled: true,
				cooldownMinutes: 5,
				excludeChats: ""
			};
			patchState({ data: { smartReplies: [...d.smartReplies, rule] } });
		}))) : null, d.smartReplies.length ? list : emptyState("No smart replies yet. Incoming messages matching a rule get an automatic reply."));
	}
	function viewScheduled() {
		const d = state.data;
		const number = input("Phone number with country code", "tel");
		const body = el("textarea", "tbx-d-input tbx-d-textarea");
		body.placeholder = "Message";
		body.rows = 3;
		const when = input("", "datetime-local");
		const list = el("div", "tbx-d-cards");
		for (const job of [...d.scheduled].sort((a, b) => a.fireAt - b.fireAt)) list.appendChild(el("div", "tbx-d-card", el("div", "tbx-d-card__main", el("div", "tbx-d-card__title", `${job.chatLabel || job.chatId} · ${new Date(job.fireAt).toLocaleString()}`), el("div", "tbx-d-card__body", job.body), el("span", `tbx-d-pill tbx-d-pill--${job.status}`, job.status)), el("div", "tbx-d-card__actions", iconButton("delete", "Delete", () => void patchState({ data: { scheduled: d.scheduled.filter((x) => x.id !== job.id) } })))));
		return el("div", "tbx-d-view", heading("Scheduled Messages", addToggleAction()), formOpen ? formCard(number, body, when, el("div", "tbx-d-form__actions", textButton("Schedule", () => {
			const digits = number.value.replace(/\D/g, "");
			const fireAt = new Date(when.value).getTime();
			if (!digits || !body.value.trim() || !Number.isFinite(fireAt)) return toast("Number, message and time are required");
			if (fireAt <= Date.now()) return toast("Pick a time in the future");
			formOpen = false;
			const job = {
				id: uid(),
				chatId: `${digits}@c.us`,
				chatLabel: `+${digits}`,
				body: body.value,
				fireAt,
				status: "pending"
			};
			patchState({ data: { scheduled: [...d.scheduled, job] } });
		}))) : null, d.scheduled.length ? list : emptyState("Nothing scheduled. Keep this tab open so messages can be sent on time."));
	}
	function viewTasks() {
		const d = state.data;
		const title = input("Add a task and press Enter");
		const add = () => {
			const t = title.value.trim();
			if (!t) return;
			const chat = activeChatTitle();
			patchState({ data: { tasks: [{
				id: uid(),
				title: t,
				chatLabel: chat || void 0,
				done: false,
				createdAt: Date.now()
			}, ...d.tasks] } });
		};
		title.addEventListener("keydown", (e) => {
			if (e.key === "Enter") add();
		});
		const list = el("div", "tbx-d-checks");
		for (const task of d.tasks) {
			const row = el("div", `tbx-d-taskrow${task.done ? " is-done" : ""}`, checkbox(task.done, (on) => void patchState({ data: { tasks: d.tasks.map((x) => x.id === task.id ? {
				...x,
				done: on
			} : x) } })), el("span", "tbx-d-taskrow__text", task.title, task.chatLabel ? el("small", "", task.chatLabel) : null), iconButton("delete", "Delete", () => void patchState({ data: { tasks: d.tasks.filter((x) => x.id !== task.id) } })));
			list.appendChild(row);
		}
		return el("div", "tbx-d-view", heading("Tasks"), el("div", "tbx-d-form tbx-d-form--inline", title, iconButton("add", "Add task", add)), d.tasks.length ? list : emptyState("No tasks yet. Tasks added while a chat is open are linked to it."));
	}
	function viewWebhooks() {
		const d = state.data;
		const url = input("https://example.com/webhook", "url");
		const events = /* @__PURE__ */ new Set(["message"]);
		const eventBox = el("div", "tbx-d-checks");
		for (const ev of [
			"message",
			"revoke",
			"group_join",
			"group_leave"
		]) eventBox.appendChild(el("label", "tbx-d-checkrow", checkbox(events.has(ev), (on) => on ? events.add(ev) : events.delete(ev)), el("span", "tbx-d-checkrow__label", ev.replace("_", " "))));
		const list = el("div", "tbx-d-cards");
		for (const w of d.webhooks) list.appendChild(el("div", "tbx-d-card", el("div", "tbx-d-card__main", el("div", "tbx-d-card__title", w.url), el("div", "tbx-d-card__body", w.events.join(", "))), el("div", "tbx-d-card__actions", switchEl(w.enabled, (on) => void patchState({ data: { webhooks: d.webhooks.map((x) => x.id === w.id ? {
			...x,
			enabled: on
		} : x) } }), "Enabled"), iconButton("delete", "Delete", () => void patchState({ data: { webhooks: d.webhooks.filter((x) => x.id !== w.id) } })))));
		return el("div", "tbx-d-view", heading("Webhooks and API", el("span", "", d.webhooks.length ? iconButton("send", "Send test event", () => {
			chrome.runtime.sendMessage({
				type: "WA_FIRE_WEBHOOK",
				event: "test",
				payload: { ok: true }
			}).catch(() => {});
			toast("Test event sent");
		}) : null, addToggleAction())), formOpen ? formCard(url, eventBox, el("div", "tbx-d-form__actions", textButton("Add webhook", () => {
			const u = url.value.trim();
			if (!/^https?:\/\//i.test(u)) return toast("Enter a valid http(s) URL");
			if (!events.size) return toast("Pick at least one event");
			formOpen = false;
			patchState({ data: { webhooks: [...d.webhooks, {
				id: uid(),
				url: u,
				events: [...events],
				enabled: true
			}] } });
		}))) : null, d.webhooks.length ? list : emptyState("No webhooks yet. Events are POSTed as JSON to your URL."));
	}
	function radio(name, value, checked, onPick) {
		const r = el("input", "tbx-d-radio");
		r.type = "radio";
		r.name = name;
		r.value = value;
		r.checked = checked;
		r.addEventListener("change", () => {
			if (r.checked) onPick();
		});
		return r;
	}
	function viewExport() {
		const pick = (k) => {
			exportKind = k;
			render("none");
		};
		const isContacts = exportKind.startsWith("contacts_");
		const contactRow = el("div", "tbx-d-export", el("span", "tbx-d-export__icon", icon("person")), el("div", "tbx-d-export__main", el("div", "tbx-d-export__title", "Contacts"), ...[
			["contacts_all", "All contacts numbers"],
			["contacts_chatted", "All contacts numbers who chatted with me"],
			["contacts_unsaved", "All unsaved numbers who chatted with me"]
		].map(([k, label]) => el("label", "tbx-d-export__opt", radio("tbx-exp-sub", k, exportKind === k, () => pick(k)), el("span", "", label)))), radio("tbx-exp", "contacts", isContacts, () => pick("contacts_all")));
		const simple = (k, iconName, title) => {
			return el("label", "tbx-d-export", el("span", "tbx-d-export__icon", icon(iconName)), el("div", "tbx-d-export__main", el("div", "tbx-d-export__title", title)), radio("tbx-exp", k, exportKind === k, () => pick(k)));
		};
		const run = async () => {
			toast("Exporting…");
			const rows = await queryMain(exportKind);
			if (!rows.length) return toast("Nothing to export (is WhatsApp fully loaded?)");
			downloadCsv(`whatsapp-${exportKind}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`, rows);
			toast(`Exported ${rows.length} rows`);
		};
		return el("div", "tbx-d-view", heading("Exporting", iconButton("download", "Download CSV", () => void run())), el("div", "tbx-d-exports", contactRow, simple("groups", "group", "Groups"), simple("labels", "label", "Labels"), simple("countries", "flag", "Countries")), el("p", "tbx-d-hint", "Pick what to export, then tap the download icon to save a CSV file."));
	}
	var STAT_LABELS = [
		["chats", "Total chats"],
		["users", "Personal chats"],
		["groups", "Groups"],
		["unread", "Unread chats"],
		["unreadMessages", "Unread messages"],
		["archived", "Archived"],
		["pinned", "Pinned"],
		["muted", "Muted"],
		["contacts", "Saved contacts"],
		["unsaved", "Unsaved chatters"],
		["business", "Business contacts"],
		["groupMembers", "Group members (total)"]
	];
	var statsCache = null;
	function viewStats() {
		const grid = el("div", "tbx-d-stats");
		const fill = () => {
			grid.replaceChildren(...STAT_LABELS.map(([k, label]) => el("div", "tbx-d-stat", el("div", "tbx-d-stat__value", statsCache?.[k] ?? "—"), el("div", "tbx-d-stat__label", label))));
		};
		const load = async () => {
			grid.classList.add("is-loading");
			const rows = await queryMain("stats");
			statsCache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
			grid.classList.remove("is-loading");
			if (!rows.length) toast("WhatsApp is still loading, try again shortly");
			fill();
		};
		fill();
		if (!statsCache) load();
		return el("div", "tbx-d-view", heading("Statistics", iconButton("refresh", "Refresh", () => void load())), grid);
	}
	function viewMore() {
		return el("div", "tbx-d-view", heading("More"), el("div", "tbx-d-list", navRow("open", "Open full panel", "Presets, broadcasting and utilities in Browser Toolbox.", openFullPanel), navRow("hide", "Hide sidebar button", "Show it again from the Browser Toolbox panel.", () => {
			patchState({ values: { showSideLauncher: false } });
			closeDrawer();
		}), navRow("power", "Turn off WA Web Plus", "Disable every WA Web Plus feature on this site.", () => {
			if (!confirm("Turn off WA Web Plus? You can turn it on again from Browser Toolbox.")) return;
			patchState({ enabled: false });
		})), el("p", "tbx-d-hint", `Browser Toolbox v${chrome.runtime.getManifest().version}`));
	}
	var VIEWS = {
		home: viewHome,
		enhancements: viewEnhancements,
		business: viewBusiness,
		templates: viewTemplates,
		smartReplies: viewSmartReplies,
		scheduled: viewScheduled,
		tasks: viewTasks,
		webhooks: viewWebhooks,
		export: viewExport,
		stats: viewStats,
		more: viewMore
	};
	function go(view) {
		formOpen = false;
		stack.push(view);
		render("forward");
	}
	function goBack() {
		if (stack.length <= 1) return;
		formOpen = false;
		stack.pop();
		render("back");
	}
	function render(direction) {
		if (!drawer || !bodyEl || !state) return;
		const view = stack[stack.length - 1];
		const scroll = direction === "none" ? bodyEl.scrollTop : 0;
		const content = VIEWS[view]();
		if (direction !== "none") content.classList.add(direction === "forward" ? "tbx-d-enter-fwd" : "tbx-d-enter-back");
		bodyEl.replaceChildren(content);
		bodyEl.scrollTop = scroll;
		drawer.setAttribute("aria-label", VIEW_TITLES[view]);
		if (footerEl) footerEl.lastElementChild.textContent = `${countActiveFeatures(state)} active`;
	}
	function build() {
		const root = el("aside", "tbx-d");
		root.id = DRAWER_ID;
		root.setAttribute("role", "dialog");
		root.tabIndex = -1;
		const title = el("div", "tbx-d-header__title", el("span", "", "WA Web Plus"), el("sup", "tbx-d-header__ver", "Toolbox"));
		title.addEventListener("click", () => {
			if (stack.length > 1) {
				stack = ["home"];
				formOpen = false;
				render("back");
			}
		});
		const header = el("header", "tbx-d-header", title, iconButton("close", "Close", closeDrawer));
		bodyEl = el("div", "tbx-d-body");
		footerEl = el("footer", "tbx-d-footer", el("span", "", "Browser Toolbox"), el("span", "tbx-d-footer__active", ""));
		root.append(header, bodyEl, footerEl);
		return root;
	}
	function onKey(e) {
		if (e.key !== "Escape" || !drawer) return;
		const t = e.target;
		if (t && drawer.contains(t) && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
			t.blur();
			return;
		}
		if (stack.length > 1) goBack();
		else closeDrawer();
	}
	function onStorage(changes, area) {
		if (area !== "local" || !changes[STORAGE_KEY] || !drawer) return;
		const next = normalize(changes[STORAGE_KEY].newValue);
		if (!next.enabled) {
			destroyDrawer();
			return;
		}
		state = next;
		const focused = document.activeElement;
		if (focused && drawer.contains(focused) && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")) return;
		render("none");
	}
	function bindListeners() {
		if (listenersBound) return;
		listenersBound = true;
		window.addEventListener("resize", position);
		document.addEventListener("keydown", onKey, true);
		chrome.storage.onChanged.addListener(onStorage);
	}
	function unbindListeners() {
		if (!listenersBound) return;
		listenersBound = false;
		window.removeEventListener("resize", position);
		document.removeEventListener("keydown", onKey, true);
		chrome.storage.onChanged.removeListener(onStorage);
	}
	async function openDrawer() {
		state = await loadState();
		if (!state.enabled) return;
		if (!drawer) {
			drawer = build();
			document.body.appendChild(drawer);
		}
		stack = ["home"];
		formOpen = false;
		statsCache = null;
		drawer.classList.remove("is-closing");
		position();
		render("none");
		bindListeners();
		document.documentElement.setAttribute(OPEN_ATTR, "true");
		requestAnimationFrame(() => drawer?.classList.add("is-open"));
		drawer.focus({ preventScroll: true });
	}
	function closeDrawer() {
		if (!drawer) return;
		const d = drawer;
		document.documentElement.removeAttribute(OPEN_ATTR);
		unbindListeners();
		d.classList.remove("is-open");
		d.classList.add("is-closing");
		setTimeout(() => {
			if (d.classList.contains("is-closing")) {
				d.remove();
				if (drawer === d) {
					drawer = null;
					bodyEl = null;
					footerEl = null;
				}
			}
		}, 200);
	}
	function toggleDrawer() {
		if (drawer?.classList.contains("is-open")) closeDrawer();
		else openDrawer();
	}
	function destroyDrawer() {
		unbindListeners();
		document.documentElement.removeAttribute(OPEN_ATTR);
		drawer?.remove();
		document.getElementById(DRAWER_ID)?.remove();
		drawer = null;
		bodyEl = null;
		footerEl = null;
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
		btn.title = "WA Web Plus";
		btn.setAttribute("aria-label", "WA Web Plus");
		btn.innerHTML = PLUS_SVG;
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			toggleDrawer();
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
		destroyDrawer();
		const root = document.documentElement;
		for (const attr of [...root.attributes]) if (attr.name.startsWith("data-tbx-wa-")) root.removeAttribute(attr.name);
		document.getElementById(STYLE_LINK_ID)?.remove();
		document.querySelectorAll("#tbx-wa-launcher, .tbx-wa-launcher, .tbx-wa-msg-actions, .tbx-wa-extra-btn, .tbx-wa-restored-msg").forEach((el) => el.remove());
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
