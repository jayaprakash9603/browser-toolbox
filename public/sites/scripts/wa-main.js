(function() {
	//#region src/core/sites/whatsapp/constants.ts
	var PAGE_CMD_KEY = "__toolboxWaCmd";
	var PAGE_EVT_KEY = "__toolboxWaEvt";
	//#endregion
	//#region src/core/sites/whatsapp/countries.ts
	var CALLING_CODES = {
		"1": "United States / Canada",
		"7": "Russia / Kazakhstan",
		"20": "Egypt",
		"27": "South Africa",
		"30": "Greece",
		"31": "Netherlands",
		"32": "Belgium",
		"33": "France",
		"34": "Spain",
		"36": "Hungary",
		"39": "Italy",
		"40": "Romania",
		"41": "Switzerland",
		"43": "Austria",
		"44": "United Kingdom",
		"45": "Denmark",
		"46": "Sweden",
		"47": "Norway",
		"48": "Poland",
		"49": "Germany",
		"51": "Peru",
		"52": "Mexico",
		"53": "Cuba",
		"54": "Argentina",
		"55": "Brazil",
		"56": "Chile",
		"57": "Colombia",
		"58": "Venezuela",
		"60": "Malaysia",
		"61": "Australia",
		"62": "Indonesia",
		"63": "Philippines",
		"64": "New Zealand",
		"65": "Singapore",
		"66": "Thailand",
		"81": "Japan",
		"82": "South Korea",
		"84": "Vietnam",
		"86": "China",
		"90": "Turkey",
		"91": "India",
		"92": "Pakistan",
		"93": "Afghanistan",
		"94": "Sri Lanka",
		"95": "Myanmar",
		"98": "Iran",
		"211": "South Sudan",
		"212": "Morocco",
		"213": "Algeria",
		"216": "Tunisia",
		"218": "Libya",
		"220": "Gambia",
		"221": "Senegal",
		"225": "Côte d'Ivoire",
		"233": "Ghana",
		"234": "Nigeria",
		"237": "Cameroon",
		"244": "Angola",
		"249": "Sudan",
		"251": "Ethiopia",
		"254": "Kenya",
		"255": "Tanzania",
		"256": "Uganda",
		"260": "Zambia",
		"263": "Zimbabwe",
		"351": "Portugal",
		"352": "Luxembourg",
		"353": "Ireland",
		"355": "Albania",
		"358": "Finland",
		"359": "Bulgaria",
		"370": "Lithuania",
		"371": "Latvia",
		"372": "Estonia",
		"380": "Ukraine",
		"381": "Serbia",
		"385": "Croatia",
		"420": "Czechia",
		"421": "Slovakia",
		"880": "Bangladesh",
		"886": "Taiwan",
		"852": "Hong Kong",
		"960": "Maldives",
		"961": "Lebanon",
		"962": "Jordan",
		"963": "Syria",
		"964": "Iraq",
		"965": "Kuwait",
		"966": "Saudi Arabia",
		"967": "Yemen",
		"968": "Oman",
		"970": "Palestine",
		"971": "United Arab Emirates",
		"972": "Israel",
		"973": "Bahrain",
		"974": "Qatar",
		"977": "Nepal"
	};
	/** Longest-prefix match of an international number (digits only) to a calling code. */
	function countryForNumber(digits) {
		for (let len = 3; len >= 1; len--) {
			const code = digits.slice(0, len);
			const country = CALLING_CODES[code];
			if (country) return {
				code,
				country
			};
		}
		return {
			code: "",
			country: "Unknown"
		};
	}
	//#endregion
	//#region src/core/sites/whatsapp/features.ts
	function toggles(section, ids, impl) {
		return ids.map((id) => ({
			id,
			section,
			kind: "toggle",
			impl,
			default: false
		}));
	}
	/** Only features WhatsApp Web does not already offer natively. */
	var WHATSAPP_FEATURES = [
		...toggles("privacy", [
			"blurContactNames",
			"blurContactPhotos",
			"blurRecentMessages",
			"blurConversationMessages",
			"blurComposer"
		], "css"),
		...toggles("privacy", ["restoreDeletedMessages"], "script"),
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
			"btnStartChat",
			"btnTranslate",
			"btnQuickReply",
			"btnAddTask"
		], "script")
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
	function startPrivacy(state) {
		stopPrivacy();
		const api = window.WPP;
		if (!api || !isFeatureOn(state.values, "restoreDeletedMessages")) return;
		const onNew = (msg) => postToMain("cacheMessage", msg);
		const onRevoke = (data) => postToMain("messageRevoked", data);
		api.ev.on("chat.new_message", onNew);
		api.ev.on("chat.msg_revoke", onRevoke);
		privacyStop = () => {
			api.ev.off("chat.new_message", onNew);
			api.ev.off("chat.msg_revoke", onRevoke);
		};
	}
	function stopPrivacy() {
		privacyStop?.();
		privacyStop = null;
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
	function call(fn, ...args) {
		if (typeof fn !== "function") return Promise.resolve(void 0);
		return Promise.resolve(fn(...args)).catch(() => void 0);
	}
	function participantCount(chat) {
		const p = chat.groupMetadata?.participants;
		if (!p) return 0;
		return p.getModelsArray?.().length ?? p.length ?? 0;
	}
	function isUserChat(c) {
		return c.id?.server === "c.us" || c.id?.server === "lid";
	}
	async function runQuery(wpp, kind) {
		const rows = [];
		try {
			if (kind.startsWith("check:")) {
				const num = kind.slice(6).replace(/\D/g, "");
				const exists = await call(wpp.contact?.queryExists, `${num}@c.us`);
				rows.push({
					number: num,
					exists: exists?.wid ? "yes" : "no"
				});
				return rows;
			}
			const chats = await call(wpp.chat.list) ?? [];
			const contacts = await call(wpp.contact?.list) ?? [];
			if (kind === "contacts_all" || kind === "contacts") for (const c of contacts) {
				if (!c.isMyContact || c.id?.server !== "c.us") continue;
				rows.push({
					number: c.id?.user ?? "",
					name: c.name ?? "",
					pushname: c.pushname ?? ""
				});
			}
			else if (kind === "contacts_chatted" || kind === "contacts_unsaved") {
				const unsavedOnly = kind === "contacts_unsaved";
				for (const c of chats) {
					if (!isUserChat(c)) continue;
					const saved = c.contact?.isMyContact === true;
					if (unsavedOnly && saved) continue;
					rows.push({
						number: c.id?.user ?? "",
						name: c.contact?.name ?? c.formattedTitle ?? "",
						pushname: c.contact?.pushname ?? "",
						saved: saved ? "yes" : "no"
					});
				}
			} else if (kind === "groups") for (const c of chats) {
				if (c.id?.server !== "g.us") continue;
				rows.push({
					id: c.id?._serialized ?? "",
					name: c.formattedTitle ?? c.name ?? "",
					participants: String(participantCount(c))
				});
			}
			else if (kind === "labels") {
				const labelsApi = window.WPP?.labels;
				const labels = await call(labelsApi?.getAllLabels) ?? [];
				for (const l of labels) rows.push({
					id: String(l.id ?? ""),
					name: l.name ?? "",
					color: l.hexColor ?? "",
					chats: String(l.count ?? "")
				});
			} else if (kind === "countries") {
				const counts = /* @__PURE__ */ new Map();
				for (const c of contacts) {
					if (!c.isMyContact || c.id?.server !== "c.us" || !c.id.user) continue;
					const { code, country } = countryForNumber(c.id.user);
					const cur = counts.get(country) ?? {
						code,
						country,
						n: 0
					};
					cur.n++;
					counts.set(country, cur);
				}
				for (const v of [...counts.values()].sort((a, b) => b.n - a.n)) rows.push({
					country: v.country,
					code: v.code ? `+${v.code}` : "",
					contacts: String(v.n)
				});
			} else if (kind === "stats") {
				const users = chats.filter(isUserChat);
				const groups = chats.filter((c) => c.id?.server === "g.us");
				const now = Date.now() / 1e3;
				const stat = (key, value) => rows.push({
					key,
					value: String(value)
				});
				stat("chats", chats.length);
				stat("users", users.length);
				stat("groups", groups.length);
				stat("unread", chats.filter((c) => (c.unreadCount ?? 0) > 0).length);
				stat("unreadMessages", chats.reduce((n, c) => n + Math.max(0, c.unreadCount ?? 0), 0));
				stat("archived", chats.filter((c) => c.archive).length);
				stat("pinned", chats.filter((c) => (c.pin ?? 0) > 0).length);
				stat("muted", chats.filter((c) => (c.muteExpiration ?? 0) !== 0 && ((c.muteExpiration ?? 0) < 0 || (c.muteExpiration ?? 0) > now)).length);
				stat("contacts", contacts.filter((c) => c.isMyContact && c.id?.server === "c.us").length);
				stat("unsaved", users.filter((c) => !c.contact?.isMyContact).length);
				stat("business", contacts.filter((c) => c.isBusiness).length);
				stat("groupMembers", groups.reduce((n, c) => n + participantCount(c), 0));
			}
		} catch {}
		return rows;
	}
	async function handleCmd(cmd, payload) {
		await whenReady();
		const wpp = getWpp();
		if (!wpp) return;
		if (cmd === "syncState") {
			if (!payload || typeof payload !== "object") {
				stopPrivacy();
				return;
			}
			const p = payload;
			startPrivacy({
				enabled: true,
				values: p.values,
				data: p.data
			});
			return;
		}
		if (cmd === "startChat" && payload && typeof payload === "object") {
			const num = String(payload.number).replace(/\D/g, "");
			if (num && wpp.chat?.openChatBottom) await wpp.chat.openChatBottom(`${num}@c.us`);
		}
		if (cmd === "export" && payload && typeof payload === "object") {
			const rows = await runQuery(wpp, String(payload.kind));
			window.postMessage({
				[PAGE_EVT_KEY]: "exportResult",
				payload: rows
			}, location.origin || "*");
			return;
		}
		if (cmd === "query" && payload && typeof payload === "object") {
			const { kind, reqId } = payload;
			const rows = await runQuery(wpp, String(kind));
			window.postMessage({
				[PAGE_EVT_KEY]: "queryResult",
				payload: {
					reqId,
					rows
				}
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
