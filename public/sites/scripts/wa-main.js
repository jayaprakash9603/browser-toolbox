(function() {
	//#region src/core/sites/whatsapp/constants.ts
	var PAGE_CMD_KEY = "__toolboxWaCmd";
	var PAGE_EVT_KEY = "__toolboxWaEvt";
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
	WHATSAPP_FEATURES.filter((f) => f.impl === "css").map((f) => f.id);
	WHATSAPP_FEATURES.filter((f) => f.impl === "script").map((f) => f.id);
	//#endregion
	//#region src/core/sites/whatsapp/helpers.ts
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
	//#region src/chrome/content/sites/whatsapp/bridge.ts
	function postToMain(command, payload) {
		window.postMessage({
			[PAGE_CMD_KEY]: command,
			payload
		}, location.origin || "*");
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/privacy.ts
	var privacyStop = null;
	var revokeHandler = null;
	var newMsgHandler = null;
	function wpp() {
		return window.WPP ?? null;
	}
	function startPrivacy(state) {
		stopPrivacy();
		const v = state.values;
		const api = wpp();
		if (!api) return;
		if (isFeatureOn(v, "invisibleMode")) {
			api.conn.setOnline?.(false);
			api.privacy?.setOnline?.(false);
		}
		if (isFeatureOn(v, "restoreDeletedMessages")) {
			newMsgHandler = (msg) => {
				postToMain("cacheMessage", msg);
			};
			revokeHandler = (data) => {
				postToMain("messageRevoked", data);
			};
			api.ev.on("chat.new_message", newMsgHandler);
			api.ev.on("chat.msg_revoke", revokeHandler);
		}
		privacyStop = () => {
			if (newMsgHandler) api.ev.off("chat.new_message", newMsgHandler);
			if (revokeHandler) api.ev.off("chat.msg_revoke", revokeHandler);
			newMsgHandler = null;
			revokeHandler = null;
			if (isFeatureOn(v, "invisibleMode")) {
				api.conn.setOnline?.(true);
				api.privacy?.setOnline?.(true);
			}
		};
	}
	function stopPrivacy() {
		privacyStop?.();
		privacyStop = null;
	}
	/** Best-effort: block read receipts by no-oping mark read when enabled */
	function patchReadReceipts(enabled) {
		const api = wpp();
		if (!api?.chat) return;
		const chat = api.chat;
		if (enabled && !chat.__tbxPatched) {
			const orig = chat.markIsRead?.bind(chat);
			if (orig) {
				chat.markIsRead = async () => void 0;
				chat.__tbxPatched = true;
				chat.__tbxOrigMark = orig;
			}
		} else if (!enabled) {
			const orig = chat.__tbxOrigMark;
			if (orig) {
				chat.markIsRead = orig;
				delete chat.__tbxPatched;
			}
		}
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/main.ts
	function getWpp() {
		return window.WPP;
	}
	async function whenReady() {
		const wpp = getWpp();
		if (!wpp) return;
		await wpp.isReady;
	}
	async function handleCmd(cmd, payload) {
		await whenReady();
		const wpp = getWpp();
		if (!wpp) return;
		if (cmd === "syncState") {
			if (!payload || typeof payload !== "object") {
				stopPrivacy();
				patchReadReceipts(false);
				return;
			}
			const p = payload;
			startPrivacy({
				enabled: true,
				values: p.values,
				data: p.data
			});
			patchReadReceipts(p.values.disableReadReceipts === true);
			return;
		}
		if (cmd === "toggleRead" && wpp.chat) {
			const id = (wpp.chat.getActiveChat?.())?.id?._serialized;
			if (id && wpp.chat.markIsUnread) await wpp.chat.markIsUnread(id);
			else if (id && wpp.chat.markIsRead) await wpp.chat.markIsRead(id);
		}
		if (cmd === "pinChat" && wpp.chat?.pin) {
			const id = (wpp.chat.getActiveChat?.())?.id?._serialized;
			if (id) await wpp.chat.pin(id);
		}
		if (cmd === "startChat" && payload && typeof payload === "object") {
			const num = String(payload.number).replace(/\D/g, "");
			if (num && wpp.chat?.openChatBottom) await wpp.chat.openChatBottom(`${num}@c.us`);
		}
		if (cmd === "likeMessage" && wpp.chat?.sendTextMessage) {
			const id = (wpp.chat.getActiveChat?.())?.id?._serialized;
			if (id) await wpp.chat.sendTextMessage(id, "👍");
		}
		if (cmd === "translateMessage" && payload && typeof payload === "object") {
			const text = String(payload.text);
			const Translator = window.Translator;
			if (Translator && text) try {
				const out = await (await Translator.create({
					sourceLanguage: "auto",
					targetLanguage: "en"
				})).translate(text);
				alert(out.targetText);
			} catch {
				alert("Translation not available in this browser.");
			}
			else alert("Translation not available in this browser.");
		}
		if (cmd === "export" && payload && typeof payload === "object") {
			const kind = String(payload.kind);
			const rows = [];
			try {
				if (kind.startsWith("check:")) {
					const num = kind.slice(6).replace(/\D/g, "");
					const exists = wpp.contact?.queryExists ? await wpp.contact.queryExists(`${num}@c.us`) : null;
					rows.push({
						number: num,
						exists: exists?.wid ? "yes" : "no"
					});
				} else if (wpp.contact?.list) {
					const list = await wpp.contact.list();
					for (const c of list ?? []) rows.push({
						id: c.id?.user ?? "",
						name: c.name ?? ""
					});
				}
			} catch {}
			window.postMessage({
				[PAGE_EVT_KEY]: "exportResult",
				payload: rows
			}, location.origin || "*");
			return;
		}
		if (cmd === "sendText" && payload && typeof payload === "object" && wpp.chat?.sendTextMessage) {
			const { chatId, text } = payload;
			await wpp.chat.sendTextMessage(chatId, text);
		}
		if (cmd === "cacheMessage" || cmd === "messageRevoked") chrome.runtime.sendMessage({
			type: cmd === "cacheMessage" ? "WA_CACHE_MESSAGE" : "WA_MESSAGE_REVOKED",
			payload
		});
		if (cmd === "presence") chrome.runtime.sendMessage({
			type: "WA_PRESENCE",
			payload
		});
		window.postMessage({
			[PAGE_EVT_KEY]: "ack",
			payload: cmd
		}, location.origin || "*");
	}
	var guarded = window;
	if (!guarded.__toolboxWaMain && window === window.top) {
		guarded.__toolboxWaMain = true;
		window.addEventListener("message", (event) => {
			if (event.source !== window) return;
			const data = event.data;
			if (!data || data["__toolboxWaCmd"] === void 0) return;
			handleCmd(String(data[PAGE_CMD_KEY]), data.payload);
		});
		whenReady().then(() => {
			chrome.runtime.sendMessage({
				type: "WA_RUNTIME_STATUS",
				status: "ready"
			});
		}).catch(() => {
			chrome.runtime.sendMessage({
				type: "WA_RUNTIME_STATUS",
				status: "not_logged_in"
			});
		});
	}
	//#endregion
})();
