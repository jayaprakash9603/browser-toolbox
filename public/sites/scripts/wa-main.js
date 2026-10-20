(function() {
	//#region src/core/sites/whatsapp/chatExport.ts
	function redactPhones(text) {
		return text.replace(/(\+?\d[\d\s().-]{6,}\d)/g, "[number]");
	}
	function escapeHtml(s) {
		return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}
	function formatTime(ts, utc) {
		const d = new Date(ts);
		return utc ? d.toISOString() : d.toLocaleString();
	}
	function normalizeMessages(raw, opts, nameFor) {
		const fromMs = opts.dateFrom ? Date.parse(opts.dateFrom) : NaN;
		const toMs = opts.dateTo ? Date.parse(opts.dateTo) + 864e5 - 1 : NaN;
		const out = [];
		for (const m of raw) {
			if (!m || typeof m !== "object") continue;
			const row = m;
			const fromMe = Boolean(row.fromMe);
			if (opts.onlyMyMessages && !fromMe) continue;
			if (opts.excludeMyMessages && fromMe) continue;
			const t = Number(row.t ?? 0);
			const timestampMs = t > 0xe8d4a51000 ? t : t * 1e3;
			if (!Number.isNaN(fromMs) && timestampMs < fromMs) continue;
			if (!Number.isNaN(toMs) && timestampMs > toMs) continue;
			let body = String(row.body ?? row.caption ?? "");
			const type = String(row.type ?? "chat");
			if (!body && type !== "chat") body = `[${type}]`;
			const author = String(row.author?.user ?? row.author ?? "");
			const participant = opts.exportParticipantNames ? nameFor(author) : fromMe ? "Me" : "Them";
			let mediaUrl = "";
			if (opts.exportMedia && type !== "chat") {
				const direct = String(row.directPath ?? row.deprecatedMms3Url ?? row.clientUrl ?? "");
				if (direct) mediaUrl = opts.stableMedia ? direct : direct;
			}
			if (opts.redactPhoneNumbers) body = redactPhones(body);
			out.push({
				id: String(row.id?.id ?? row.id ?? `${timestampMs}-${out.length}`),
				fromMe,
				timestampMs,
				body,
				type,
				participant,
				mediaUrl
			});
		}
		out.sort((a, b) => a.timestampMs - b.timestampMs);
		return out;
	}
	function buildChatExportFile(chatTitle, messages, opts) {
		const safe = chatTitle.replace(/[^\w.-]+/g, "_").slice(0, 60) || "chat";
		const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		if (opts.format === "json") {
			const payload = {
				...opts.exportChatName ? { chat: chatTitle } : {},
				exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
				messages: messages.map((m) => ({
					...m,
					time: formatTime(m.timestampMs, opts.exportUtcTime)
				}))
			};
			return {
				filename: `whatsapp-${safe}-${stamp}.json`,
				mime: "application/json",
				content: JSON.stringify(payload, null, 2)
			};
		}
		const rows = messages.map((m) => ({
			time: formatTime(m.timestampMs, opts.exportUtcTime),
			from: m.participant,
			message: m.body,
			type: m.type,
			media: m.mediaUrl
		}));
		if (opts.format === "csv") {
			const header = [
				"time",
				"from",
				"message",
				"type",
				"media"
			];
			const lines = [header.join(","), ...rows.map((r) => header.map((k) => `"${String(r[k] ?? "").replace(/"/g, "\"\"")}"`).join(","))];
			return {
				filename: `whatsapp-${safe}-${stamp}.csv`,
				mime: "text/csv;charset=utf-8",
				content: `\ufeff${lines.join("\n")}`
			};
		}
		const title = opts.exportChatName ? `<h1>${escapeHtml(chatTitle)}</h1>` : "";
		const items = rows.map((r) => {
			const media = r.media ? `<div><a href="${escapeHtml(r.media)}">media</a></div>` : "";
			return `<div class="msg"><div class="meta">${escapeHtml(r.time)} · ${escapeHtml(r.from)}</div><div class="body">${escapeHtml(r.message)}</div>${media}</div>`;
		}).join("\n");
		const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(chatTitle)}</title>
<style>body{font:14px system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px}
.msg{margin:12px 0;padding:10px 12px;border-radius:8px;background:#f4f4f5}
.meta{font-size:12px;color:#666;margin-bottom:4px}</style></head><body>${title}${items}</body></html>`;
		if (opts.format === "excel") return {
			filename: `whatsapp-${safe}-${stamp}.xls`,
			mime: "application/vnd.ms-excel",
			content: html
		};
		return {
			filename: `whatsapp-${safe}-${stamp}.html`,
			mime: "text/html;charset=utf-8",
			content: html
		};
	}
	//#endregion
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
	new Set("a an the and or but in on at to for of is it i you we they he she this that with as be are was were have has had do does did not".split(" "));
	function resolveRangeMs(range) {
		const now = Date.now();
		if (typeof range !== "string") return {
			fromMs: Date.parse(range.from),
			toMs: range.to ? Date.parse(range.to) + 864e5 - 1 : Date.now(),
			label: `${range.from} – ${range.to || "now"}`
		};
		const d = {
			"7d": 7,
			"30d": 30,
			"90d": 90,
			"1y": 365,
			all: null
		}[range] ?? 30;
		if (d === null) return {
			fromMs: null,
			toMs: now,
			label: "All time"
		};
		return {
			fromMs: now - d * 864e5,
			toMs: now,
			label: `Last ${d} days`
		};
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/analytics/collect.ts
	var PER_CHAT_CAP = 1e3;
	var URL_RE = /https?:\/\/|www\./i;
	function call$1(fn, ...args) {
		if (typeof fn !== "function") return Promise.resolve(void 0);
		return Promise.resolve(fn(...args)).catch(() => void 0);
	}
	function chatTitle(c) {
		return c.formattedTitle ?? c.name ?? c.id?.user ?? "Chat";
	}
	function serializeMessage(chat, m) {
		const t = Number(m.t ?? 0);
		const timestampMs = t > 0xe8d4a51000 ? t : t * 1e3;
		if (!timestampMs) return null;
		const body = String(m.body ?? m.caption ?? "").trim().slice(0, 2e3);
		const type = String(m.type ?? "chat");
		const author = m.author?.user ?? String(m.author ?? "");
		const authorName = String(m.notifyName ?? m.pushName ?? "");
		const hasMedia = Boolean(m.isMedia || m.mediaData || type !== "chat");
		return {
			chatId: chat.id?._serialized ?? "",
			chatName: chatTitle(chat),
			isGroup: chat.isGroup === true || chat.id?.server === "g.us",
			fromMe: Boolean(m.fromMe),
			timestampMs,
			type,
			author,
			authorName,
			body: body || (type !== "chat" ? `[${type}]` : ""),
			hasMedia,
			hasLink: URL_RE.test(body)
		};
	}
	async function optionalCount(paths) {
		for (const [root, key] of paths) {
			if (!root) continue;
			const fn = root[key];
			const list = await call$1(fn);
			if (Array.isArray(list)) return list.length;
		}
		return null;
	}
	async function collectAnalytics(wpp, range, onProgress) {
		const { fromMs } = resolveRangeMs(range);
		const chats = await call$1(wpp.chat.list) ?? [];
		const messages = [];
		let analyzedChats = 0;
		for (const chat of chats) {
			const chatId = chat.id?._serialized;
			if (!chatId || !wpp.chat.getMessages) continue;
			let batch = await call$1(wpp.chat.getMessages, chatId, { count: PER_CHAT_CAP }) ?? [];
			if (!batch.length) batch = await call$1(wpp.chat.getMessages, chatId) ?? [];
			for (const raw of batch) {
				if (!raw || typeof raw !== "object") continue;
				const msg = serializeMessage(chat, raw);
				if (!msg) continue;
				if (fromMs != null && msg.timestampMs < fromMs) continue;
				messages.push(msg);
			}
			analyzedChats++;
			if (analyzedChats % 5 === 0 || analyzedChats === chats.length) onProgress?.(`Analyzed ${messages.length} messages across ${analyzedChats} chats`);
		}
		const contactCount = (await call$1(wpp.contact?.list) ?? []).filter((c) => c.isMyContact).length;
		const labels = await call$1(wpp.labels?.getAllLabels) ?? [];
		const blocked = await call$1(wpp.blocklist?.all) ?? [];
		const optional = {
			channels: await optionalCount([[wpp.newsletter, "getSubscribers"], [wpp.newsletter, "list"]]),
			statusPosts: await optionalCount([[wpp.status, "list"], [wpp.status, "get"]]),
			communities: await optionalCount([[wpp.community, "list"], [wpp.community, "getAll"]]),
			calls: await optionalCount([[wpp.call, "list"], [wpp.call, "getCalls"]]),
			catalogProducts: await optionalCount([[wpp.catalog, "getProducts"], [wpp.catalog, "list"]]),
			orders: await optionalCount([[wpp.order, "list"], [wpp.order, "getAll"]])
		};
		return {
			messages,
			chats: chats.map((c) => ({
				id: c.id?._serialized ?? "",
				name: chatTitle(c),
				isGroup: c.isGroup === true || c.id?.server === "g.us",
				unreadCount: Math.max(0, c.unreadCount ?? 0)
			})),
			contactCount,
			blockedCount: blocked.length,
			labelCount: labels.length,
			optional
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
		{
			id: "chatPulse",
			section: "custom",
			kind: "toggle",
			impl: "script",
			default: true
		},
		{
			id: "btnExportChat",
			section: "buttons",
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
		contextMenuPauseAdblock: "Pause ad blocking on this site",
		contextMenuSaveImageAs: "Save image as",
		contextMenuPip: "Picture-in-Picture",
		commandTogglePip: "Toggle Picture-in-Picture for the current tab"
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
		if (cmd === "analytics" && payload && typeof payload === "object") {
			const { reqId, range } = payload;
			const postProgress = (message) => {
				window.postMessage({
					[PAGE_EVT_KEY]: "analyticsProgress",
					payload: {
						reqId,
						message
					}
				}, location.origin || "*");
			};
			let dataset = null;
			if (wpp) dataset = await collectAnalytics(wpp, range, postProgress);
			window.postMessage({
				[PAGE_EVT_KEY]: "analyticsResult",
				payload: {
					reqId,
					dataset
				}
			}, location.origin || "*");
			return;
		}
		if (cmd === "exportChat" && payload && typeof payload === "object") {
			const { reqId, options } = payload;
			const chat = await call(wpp.chat?.getActiveChat);
			const chatId = chat?.id?._serialized;
			let file = null;
			if (chatId && wpp.chat?.getMessages) {
				const raw = await call(wpp.chat.getMessages, chatId, { count: 8e3 }) ?? await call(wpp.chat.getMessages, chatId) ?? [];
				file = buildChatExportFile(chat?.formattedTitle ?? chat?.name ?? "Chat", normalizeMessages(raw, options, (author) => {
					return raw.find((m) => {
						const a = m.author;
						return a?.user === author || String(a) === author;
					})?.notifyName ?? author ?? "Unknown";
				}), options);
			}
			window.postMessage({
				[PAGE_EVT_KEY]: "exportChatResult",
				payload: {
					reqId,
					file
				}
			}, location.origin || "*");
			return;
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
