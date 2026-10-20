(function() {
	//#region src/core/sites/whatsapp/constants.ts
	var PAGE_CMD_KEY = "__toolboxWaCmd";
	var PAGE_EVT_KEY = "__toolboxWaEvt";
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
	function exportChatMain(options, timeoutMs = 6e4) {
		const reqId = `ec${Date.now()}_${++reqSeq}`;
		return new Promise((resolve) => {
			const finish = (file) => {
				window.removeEventListener("message", listener);
				clearTimeout(timer);
				resolve(file);
			};
			const listener = (e) => {
				if (e.source !== window) return;
				const data = e.data;
				if (!data || data["__toolboxWaEvt"] !== "exportChatResult") return;
				const p = data.payload;
				if (p?.reqId === reqId) finish(p.file ?? null);
			};
			const timer = setTimeout(() => finish(null), timeoutMs);
			window.addEventListener("message", listener);
			postToMain("exportChat", {
				reqId,
				options
			});
		});
	}
	function analyticsMain(range, onProgress, timeoutMs = 3e5) {
		const reqId = `an${Date.now()}_${++reqSeq}`;
		return new Promise((resolve) => {
			const finish = (dataset) => {
				window.removeEventListener("message", listener);
				clearTimeout(timer);
				resolve(dataset);
			};
			const listener = (e) => {
				if (e.source !== window) return;
				const data = e.data;
				if (!data) return;
				const evt = data[PAGE_EVT_KEY];
				const p = data.payload;
				if (evt === "analyticsProgress" && p?.reqId === reqId && p.message) onProgress?.(p.message);
				if (evt === "analyticsResult" && p?.reqId === reqId) finish(p.dataset ?? null);
			};
			const timer = setTimeout(() => finish(null), timeoutMs);
			window.addEventListener("message", listener);
			postToMain("analytics", {
				reqId,
				range
			});
		});
	}
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
	/** ISO 3166-1 alpha-2 for map highlighting (subset of calling-code destinations). */
	var COUNTRY_ISO2 = {
		"United States / Canada": "US",
		"Russia / Kazakhstan": "RU",
		Egypt: "EG",
		"South Africa": "ZA",
		Greece: "GR",
		Netherlands: "NL",
		Belgium: "BE",
		France: "FR",
		Spain: "ES",
		Hungary: "HU",
		Italy: "IT",
		Romania: "RO",
		Switzerland: "CH",
		Austria: "AT",
		"United Kingdom": "GB",
		Denmark: "DK",
		Sweden: "SE",
		Norway: "NO",
		Poland: "PL",
		Germany: "DE",
		Peru: "PE",
		Mexico: "MX",
		Cuba: "CU",
		Argentina: "AR",
		Brazil: "BR",
		Chile: "CL",
		Colombia: "CO",
		Venezuela: "VE",
		Malaysia: "MY",
		Australia: "AU",
		Indonesia: "ID",
		Philippines: "PH",
		"New Zealand": "NZ",
		Singapore: "SG",
		Thailand: "TH",
		Japan: "JP",
		"South Korea": "KR",
		Vietnam: "VN",
		China: "CN",
		Turkey: "TR",
		India: "IN",
		Pakistan: "PK",
		Bangladesh: "BD",
		Nigeria: "NG",
		Kenya: "KE",
		Israel: "IL",
		"Saudi Arabia": "SA",
		"United Arab Emirates": "AE"
	};
	function iso2ForCountry(country) {
		return COUNTRY_ISO2[country] ?? "";
	}
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
	//#region src/core/sites/whatsapp/analytics/computeReport.ts
	var STOP = new Set("a an the and or but in on at to for of is it i you we they he she this that with as be are was were have has had do does did not".split(" "));
	var URL_RE = /https?:\/\/|www\./i;
	var EMOJI_RE = /\p{Extended_Pictographic}/gu;
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
	function filterMessages(messages, fromMs, toMs) {
		return messages.filter((m) => {
			if (fromMs != null && m.timestampMs < fromMs) return false;
			if (toMs != null && m.timestampMs > toMs) return false;
			return true;
		});
	}
	function topN(map, n = 10) {
		return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({
			label,
			value
		}));
	}
	function wordCount(text) {
		return text.trim() ? text.trim().split(/\s+/).length : 0;
	}
	function computeResponseTimes(messages) {
		const byChat = /* @__PURE__ */ new Map();
		for (const m of messages) {
			const list = byChat.get(m.chatId) ?? [];
			list.push(m);
			byChat.set(m.chatId, list);
		}
		const deltas = [];
		for (const list of byChat.values()) {
			list.sort((a, b) => a.timestampMs - b.timestampMs);
			for (let i = 0; i < list.length - 1; i++) {
				const cur = list[i];
				const next = list[i + 1];
				if (!cur.fromMe && next.fromMe) deltas.push((next.timestampMs - cur.timestampMs) / 6e4);
			}
		}
		return deltas.filter((d) => d >= 0 && d < 10080);
	}
	function computeStreaks(messages) {
		const days = new Set(messages.map((m) => new Date(m.timestampMs).toISOString().slice(0, 10)));
		const sorted = [...days].sort();
		let longest = 0;
		let run = 0;
		let prev = null;
		for (const d of sorted) {
			if (!prev) run = 1;
			else run = (Date.parse(d) - Date.parse(prev)) / 864e5 === 1 ? run + 1 : 1;
			longest = Math.max(longest, run);
			prev = d;
		}
		const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		let current = 0;
		for (let i = 0; i < 400; i++) {
			const d = (/* @__PURE__ */ new Date(Date.now() - i * 864e5)).toISOString().slice(0, 10);
			if (days.has(d)) current++;
			else break;
		}
		if (!days.has(today) && current === 0 && sorted.length) {
			const last = sorted[sorted.length - 1];
			if ((Date.parse(today) - Date.parse(last)) / 864e5 === 1) current = 1;
		}
		return {
			current,
			longest
		};
	}
	function computeReport(dataset, range) {
		const { fromMs, toMs, label } = resolveRangeMs(range);
		const messages = filterMessages(dataset.messages, fromMs, toMs);
		const sent = messages.filter((m) => m.fromMe).length;
		const received = messages.length - sent;
		const groups = new Set(messages.filter((m) => m.isGroup).map((m) => m.chatId));
		const chatIds = new Set(messages.map((m) => m.chatId));
		const daily = /* @__PURE__ */ new Map();
		const hourly = Array.from({ length: 24 }, () => 0);
		const weekday = Array.from({ length: 7 }, () => 0);
		const monthly = /* @__PURE__ */ new Map();
		const types = /* @__PURE__ */ new Map();
		const byChat = /* @__PURE__ */ new Map();
		const byGroup = /* @__PURE__ */ new Map();
		const byDm = /* @__PURE__ */ new Map();
		const groupSenders = /* @__PURE__ */ new Map();
		const words = /* @__PURE__ */ new Map();
		const emojis = /* @__PURE__ */ new Map();
		let links = 0;
		let media = 0;
		let totalWords = 0;
		let totalChars = 0;
		let nightReplies = 0;
		const lastByChat = /* @__PURE__ */ new Map();
		const silences = [];
		for (const m of messages) {
			const d = new Date(m.timestampMs);
			const dayKey = d.toISOString().slice(0, 10);
			const day = daily.get(dayKey) ?? {
				sent: 0,
				received: 0
			};
			if (m.fromMe) day.sent++;
			else day.received++;
			daily.set(dayKey, day);
			hourly[d.getHours()]++;
			weekday[d.getDay()]++;
			const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + 1);
			types.set(m.type, (types.get(m.type) ?? 0) + 1);
			byChat.set(m.chatName, (byChat.get(m.chatName) ?? 0) + 1);
			if (m.isGroup) {
				byGroup.set(m.chatName, (byGroup.get(m.chatName) ?? 0) + 1);
				const sender = m.authorName || m.author || "Unknown";
				groupSenders.set(sender, (groupSenders.get(sender) ?? 0) + 1);
			} else byDm.set(m.chatName, (byDm.get(m.chatName) ?? 0) + 1);
			if (m.hasLink || URL_RE.test(m.body)) links++;
			if (m.hasMedia) media++;
			const wc = wordCount(m.body);
			totalWords += wc;
			totalChars += m.body.length;
			for (const w of m.body.toLowerCase().split(/\W+/)) {
				if (w.length < 3 || STOP.has(w)) continue;
				words.set(w, (words.get(w) ?? 0) + 1);
			}
			for (const e of m.body.match(EMOJI_RE) ?? []) emojis.set(e, (emojis.get(e) ?? 0) + 1);
			if (m.fromMe && (d.getHours() < 6 || d.getHours() >= 23)) nightReplies++;
			const prev = lastByChat.get(m.chatId);
			if (prev != null) {
				const gapDays = (m.timestampMs - prev) / 864e5;
				if (gapDays > 7) silences.push({
					label: m.chatName,
					value: Math.round(gapDays)
				});
			}
			lastByChat.set(m.chatId, m.timestampMs);
		}
		const responseDeltas = computeResponseTimes(messages);
		responseDeltas.sort((a, b) => a - b);
		const medianMin = responseDeltas.length ? responseDeltas[Math.floor(responseDeltas.length / 2)] : 0;
		const fastestMin = responseDeltas.length ? responseDeltas[0] : 0;
		const slowestMin = responseDeltas.length ? responseDeltas[responseDeltas.length - 1] : 0;
		const firstReplyMin = responseDeltas.length ? responseDeltas[0] : 0;
		const delayed = responseDeltas.filter((d) => d > 60).length;
		const responseByHour = Array.from({ length: 24 }, () => 0);
		const responseCounts = Array.from({ length: 24 }, () => 0);
		for (const m of messages) {
			if (!m.fromMe) continue;
			const h = new Date(m.timestampMs).getHours();
			responseByHour[h] += 1;
			responseCounts[h] += 1;
		}
		for (let i = 0; i < 24; i++) if (responseCounts[i]) responseByHour[i] = responseByHour[i] / responseCounts[i];
		const starters = /* @__PURE__ */ new Map();
		const byChatMsgs = /* @__PURE__ */ new Map();
		for (const m of messages) {
			const list = byChatMsgs.get(m.chatId) ?? [];
			list.push(m);
			byChatMsgs.set(m.chatId, list);
		}
		for (const list of byChatMsgs.values()) {
			list.sort((a, b) => a.timestampMs - b.timestampMs);
			const first = list[0];
			if (first?.fromMe) starters.set(first.chatName, (starters.get(first.chatName) ?? 0) + 1);
		}
		const countryCounts = /* @__PURE__ */ new Map();
		for (const c of dataset.chats) {
			if (c.isGroup) continue;
			const digits = c.id.replace(/\D/g, "");
			if (digits.length < 8) continue;
			const { country, code } = countryForNumber(digits);
			const iso2 = iso2ForCountry(country);
			const cur = countryCounts.get(country) ?? {
				country,
				code,
				iso2,
				count: 0
			};
			cur.count++;
			countryCounts.set(country, cur);
		}
		const unreadChats = dataset.chats.filter((c) => c.unreadCount > 0).length;
		const unreadMessages = dataset.chats.reduce((n, c) => n + c.unreadCount, 0);
		const daySpan = messages.length > 1 ? Math.max(1, (messages[messages.length - 1].timestampMs - messages[0].timestampMs) / 864e5) : 1;
		const dailyActivity = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, v]) => ({
			label,
			sent: v.sent,
			received: v.received
		}));
		silences.sort((a, b) => b.value - a.value);
		const sorted = [...messages].sort((a, b) => a.timestampMs - b.timestampMs);
		return {
			meta: {
				messageCount: messages.length,
				chatCount: chatIds.size,
				rangeLabel: label,
				generatedAt: (/* @__PURE__ */ new Date()).toISOString()
			},
			kpis: {
				totalMessages: messages.length,
				sent,
				received,
				chats: chatIds.size,
				groups: groups.size,
				avgPerDay: Math.round(messages.length / daySpan),
				avgResponseMin: Math.round(medianMin),
				mediaRatio: messages.length ? Math.round(media / messages.length * 100) : 0,
				links,
				unreadChats,
				unreadMessages,
				totalWords,
				contacts: dataset.contactCount,
				blocked: dataset.blockedCount,
				labels: dataset.labelCount,
				stickers: types.get("sticker") ?? 0,
				notes: 0,
				quickReplies: 0
			},
			dailyActivity,
			hourlyActivity: hourly,
			weekdayActivity: weekday,
			monthlyVolume: topN(monthly, 24),
			sentVsReceived: {
				sent,
				received
			},
			messageTypes: topN(types, 12),
			topConversations: topN(byChat),
			topGroups: topN(byGroup),
			topDms: topN(byDm),
			topGroupSenders: topN(groupSenders),
			longestSilences: silences.slice(0, 10),
			mostUnread: topN(new Map(dataset.chats.map((c) => [c.name, c.unreadCount]))),
			fastestReplies: topN(new Map(responseDeltas.slice(0, 50).map((d, i) => [`Reply ${i + 1}`, Math.round(d)])), 5),
			responseTime: {
				medianMin: Math.round(medianMin),
				fastestMin: Math.round(fastestMin),
				slowestMin: Math.round(slowestMin),
				firstReplyMin: Math.round(firstReplyMin),
				byHour: responseByHour
			},
			readNotReplied: Math.max(0, received - sent),
			avgConversationDurationMin: Math.round(daySpan * 24 * 60 / Math.max(1, chatIds.size)),
			conversationStarters: topN(starters),
			nightReplies,
			delayedReplies: delayed,
			unanswered: Math.max(0, Math.floor(received * .05)),
			streaks: computeStreaks(messages),
			account: {
				firstMessageAt: sorted[0] ? new Date(sorted[0].timestampMs).toISOString() : "",
				lastMessageAt: sorted[sorted.length - 1] ? new Date(sorted[sorted.length - 1].timestampMs).toISOString() : "",
				avgMessageLength: messages.length ? Math.round(totalChars / messages.length) : 0,
				totalWords
			},
			topWords: topN(words, 15),
			topEmojis: topN(emojis, 12),
			countries: [...countryCounts.values()].sort((a, b) => b.count - a.count).slice(0, 15),
			optional: dataset.optional
		};
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/analytics/charts.ts
	var GREEN = "#25d366";
	var MUTED = "rgba(128,128,128,0.35)";
	function svgBarChart(points, width = 280, height = 120) {
		const max = Math.max(1, ...points.map((p) => p.value));
		const pad = 8;
		const barW = points.length ? (width - 16) / points.length - 2 : 0;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		svg.setAttribute("class", "tbx-cp-chart");
		points.forEach((p, i) => {
			const h = (height - 16) * p.value / max;
			const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect.setAttribute("x", String(pad + i * (barW + 2)));
			rect.setAttribute("y", String(height - pad - h));
			rect.setAttribute("width", String(Math.max(1, barW)));
			rect.setAttribute("height", String(h));
			rect.setAttribute("fill", GREEN);
			rect.setAttribute("rx", "2");
			svg.appendChild(rect);
		});
		return svg;
	}
	function svgDualBar(points, width = 320, height = 140) {
		const max = Math.max(1, ...points.flatMap((p) => [p.sent, p.received]));
		const pad = 10;
		const groupW = points.length ? (width - 20) / points.length : 0;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		svg.setAttribute("class", "tbx-cp-chart");
		points.forEach((p, i) => {
			const x = pad + i * groupW;
			const w = Math.max(2, groupW / 2 - 2);
			for (const [val, color, off] of [[
				p.sent,
				GREEN,
				0
			], [
				p.received,
				"#128c7e",
				w + 2
			]]) {
				const h = (height - 20) * val / max;
				const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				rect.setAttribute("x", String(x + off));
				rect.setAttribute("y", String(height - pad - h));
				rect.setAttribute("width", String(w));
				rect.setAttribute("height", String(h));
				rect.setAttribute("fill", color);
				rect.setAttribute("rx", "2");
				svg.appendChild(rect);
			}
		});
		return svg;
	}
	function svgDonut(sent, received, size = 120) {
		const total = sent + received || 1;
		const r = size / 2 - 8;
		const cx = size / 2;
		const cy = size / 2;
		const sentAngle = sent / total * Math.PI * 2;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
		svg.setAttribute("class", "tbx-cp-chart tbx-cp-donut");
		const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		bg.setAttribute("cx", String(cx));
		bg.setAttribute("cy", String(cy));
		bg.setAttribute("r", String(r));
		bg.setAttribute("fill", "none");
		bg.setAttribute("stroke", MUTED);
		bg.setAttribute("stroke-width", "14");
		svg.appendChild(bg);
		const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
		const x1 = cx + r * Math.sin(0);
		const y1 = cy - r * Math.cos(0);
		const x2 = cx + r * Math.sin(sentAngle);
		const y2 = cy - r * Math.cos(sentAngle);
		const large = sentAngle > Math.PI ? 1 : 0;
		arc.setAttribute("d", `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
		arc.setAttribute("fill", "none");
		arc.setAttribute("stroke", GREEN);
		arc.setAttribute("stroke-width", "14");
		arc.setAttribute("stroke-linecap", "round");
		svg.appendChild(arc);
		return svg;
	}
	function svgGauge(value, max, size = 140) {
		const pct = Math.min(1, value / Math.max(1, max));
		const r = size / 2 - 10;
		const cx = size / 2;
		const cy = size / 2;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
		svg.setAttribute("class", "tbx-cp-chart");
		const track = document.createElementNS("http://www.w3.org/2000/svg", "path");
		track.setAttribute("d", describeArc(cx, cy, r, -120, 120));
		track.setAttribute("fill", "none");
		track.setAttribute("stroke", MUTED);
		track.setAttribute("stroke-width", "10");
		svg.appendChild(track);
		const fill = document.createElementNS("http://www.w3.org/2000/svg", "path");
		fill.setAttribute("d", describeArc(cx, cy, r, -120, -120 + 240 * pct));
		fill.setAttribute("fill", "none");
		fill.setAttribute("stroke", GREEN);
		fill.setAttribute("stroke-width", "10");
		fill.setAttribute("stroke-linecap", "round");
		svg.appendChild(fill);
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", String(cx));
		text.setAttribute("y", String(cy + 4));
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("class", "tbx-cp-gauge-val");
		text.textContent = String(Math.round(value));
		svg.appendChild(text);
		return svg;
	}
	function describeArc(cx, cy, r, startDeg, endDeg) {
		const start = polar(cx, cy, r, startDeg);
		const end = polar(cx, cy, r, endDeg);
		const large = endDeg - startDeg > 180 ? 1 : 0;
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
	}
	function polar(cx, cy, r, deg) {
		const rad = deg * Math.PI / 180;
		return {
			x: cx + r * Math.cos(rad),
			y: cy + r * Math.sin(rad)
		};
	}
	function svgHeatGrid(cells, cols = 24, cell = 10) {
		const rows = Math.ceil(cells.length / cols);
		const max = Math.max(1, ...cells);
		const width = cols * cell + 2;
		const height = rows * cell + 2;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		svg.setAttribute("class", "tbx-cp-chart");
		cells.forEach((v, i) => {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect.setAttribute("x", String(col * cell + 1));
			rect.setAttribute("y", String(row * cell + 1));
			rect.setAttribute("width", String(cell - 2));
			rect.setAttribute("height", String(cell - 2));
			rect.setAttribute("rx", "1");
			const alpha = .15 + .85 * v / max;
			rect.setAttribute("fill", `rgba(37, 211, 102, ${alpha})`);
			svg.appendChild(rect);
		});
		return svg;
	}
	function progressBars(items) {
		const wrap = document.createElement("div");
		wrap.className = "tbx-cp-bars";
		const max = Math.max(1, ...items.map((i) => i.value));
		for (const item of items) {
			const row = document.createElement("div");
			row.className = "tbx-cp-barrow";
			const label = document.createElement("span");
			label.className = "tbx-cp-barrow__label";
			label.textContent = item.label;
			const track = document.createElement("div");
			track.className = "tbx-cp-barrow__track";
			const fill = document.createElement("div");
			fill.className = "tbx-cp-barrow__fill";
			fill.style.width = `${item.value / max * 100}%`;
			track.appendChild(fill);
			const val = document.createElement("span");
			val.className = "tbx-cp-barrow__val";
			val.textContent = String(item.value);
			row.append(label, track, val);
			wrap.appendChild(row);
		}
		return wrap;
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/analytics/panels.ts
	function el$2(tag, cls, ...children) {
		const node = document.createElement(tag);
		if (cls) node.className = cls;
		for (const c of children) {
			if (c === null || c === void 0 || c === false) continue;
			node.append(typeof c === "string" ? document.createTextNode(c) : c);
		}
		return node;
	}
	function panel(title, body, wide = false) {
		return el$2("section", `tbx-cp-panel${wide ? " tbx-cp-panel--wide" : ""}`, el$2("h3", "tbx-cp-panel__title", title), el$2("div", "tbx-cp-panel__body", body));
	}
	function kpi(label, value) {
		return el$2("div", "tbx-cp-kpi", el$2("span", "tbx-cp-kpi__val", String(value)), el$2("span", "tbx-cp-kpi__label", label));
	}
	function notEnough() {
		return el$2("p", "tbx-cp-muted", "Not enough data");
	}
	function optionalBlock(title, value) {
		if (value == null) return panel(title, notEnough());
		return panel(title, el$2("p", "tbx-cp-stat", String(value)));
	}
	function renderPanels(report, worldMapSvg) {
		const grid = el$2("div", "tbx-cp-grid");
		const k = report.kpis;
		const kpiRow1 = el$2("div", "tbx-cp-kpis", kpi("Total messages", k.totalMessages), kpi("Sent", k.sent), kpi("Received", k.received), kpi("Chats", k.chats), kpi("Groups", k.groups), kpi("Avg / day", k.avgPerDay), kpi("Avg response (min)", k.avgResponseMin), kpi("Media %", k.mediaRatio));
		const kpiRow2 = el$2("div", "tbx-cp-kpis", kpi("Links", k.links), kpi("Unread chats", k.unreadChats), kpi("Unread msgs", k.unreadMessages), kpi("Words", k.totalWords), kpi("Contacts", k.contacts), kpi("Blocked", k.blocked), kpi("Labels", k.labels), kpi("Stickers", k.stickers));
		grid.append(kpiRow1, kpiRow2);
		const daily = report.dailyActivity.slice(-14);
		grid.append(panel("Daily activity", daily.length ? svgDualBar(daily) : notEnough(), true), panel("Sent vs received", svgDonut(report.sentVsReceived.sent, report.sentVsReceived.received)), panel("Activity by hour", svgHeatGrid(report.hourlyActivity, 24, 12)), panel("Activity by weekday", svgBarChart([
			"Sun",
			"Mon",
			"Tue",
			"Wed",
			"Thu",
			"Fri",
			"Sat"
		].map((label, i) => ({
			label,
			value: report.weekdayActivity[i] ?? 0
		})))), panel("Monthly volume", report.monthlyVolume.length ? svgBarChart(report.monthlyVolume.slice(-12)) : notEnough()), panel("Message types", report.messageTypes.length ? progressBars(report.messageTypes) : notEnough()), panel("Most active conversations", report.topConversations.length ? progressBars(report.topConversations) : notEnough()), panel("Top groups", report.topGroups.length ? progressBars(report.topGroups) : notEnough()), panel("Top DMs", report.topDms.length ? progressBars(report.topDms) : notEnough()), panel("Top group senders", report.topGroupSenders.length ? progressBars(report.topGroupSenders) : notEnough()), panel("Longest silences (days)", report.longestSilences.length ? progressBars(report.longestSilences) : notEnough()), panel("Most unread", report.mostUnread.length ? progressBars(report.mostUnread) : notEnough()), panel("Response time", el$2("div", "tbx-cp-response", svgGauge(report.responseTime.medianMin, Math.max(60, report.responseTime.slowestMin)), el$2("ul", "tbx-cp-list", el$2("li", "", `Median: ${report.responseTime.medianMin} min`), el$2("li", "", `Fastest: ${report.responseTime.fastestMin} min`), el$2("li", "", `Slowest: ${report.responseTime.slowestMin} min`)))), panel("Read but not replied (est.)", el$2("p", "tbx-cp-stat", String(report.readNotReplied))), panel("Activity streaks", el$2("p", "tbx-cp-stat", `Current ${report.streaks.current} days · Longest ${report.streaks.longest} days`)), panel("Account overview", el$2("ul", "tbx-cp-list", el$2("li", "", `First: ${report.account.firstMessageAt.slice(0, 10) || "—"}`), el$2("li", "", `Last: ${report.account.lastMessageAt.slice(0, 10) || "—"}`), el$2("li", "", `Avg length: ${report.account.avgMessageLength} chars`), el$2("li", "", `Total words: ${report.account.totalWords}`))), panel("Top words", report.topWords.length ? progressBars(report.topWords) : notEnough()), panel("Top emojis", report.topEmojis.length ? progressBars(report.topEmojis) : notEnough()), panel("Night replies", el$2("p", "tbx-cp-stat", String(report.nightReplies))), panel("Delayed replies", el$2("p", "tbx-cp-stat", String(report.delayedReplies))), panel("Unanswered (est.)", el$2("p", "tbx-cp-stat", String(report.unanswered))), panel("Conversation starters", report.conversationStarters.length ? progressBars(report.conversationStarters) : notEnough()));
		const countriesBody = el$2("div", "tbx-cp-countries");
		if (report.countries.length) {
			countriesBody.append(progressBars(report.countries.map((c) => ({
				label: c.country,
				value: c.count
			}))));
			if (worldMapSvg) {
				const mapWrap = el$2("div", "tbx-cp-map");
				mapWrap.innerHTML = worldMapSvg;
				countriesBody.appendChild(mapWrap);
			}
		} else countriesBody.append(notEnough());
		grid.append(panel("Top countries", countriesBody, true));
		const opt = report.optional;
		grid.append(optionalBlock("Channels", opt.channels), optionalBlock("Status", opt.statusPosts), optionalBlock("Communities", opt.communities), optionalBlock("Calls", opt.calls), optionalBlock("Catalog", opt.catalogProducts), optionalBlock("Orders", opt.orders));
		return grid;
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/analyticsDashboard.ts
	var ROOT_ID = "tbx-chatpulse-root";
	var PRESETS = [
		"7d",
		"30d",
		"90d",
		"1y",
		"all"
	];
	var currentRange = "30d";
	var report = null;
	var worldMapCache = null;
	function el$1(tag, cls, ...children) {
		const node = document.createElement(tag);
		if (cls) node.className = cls;
		for (const c of children) {
			if (c == null || c === false) continue;
			node.append(typeof c === "string" ? document.createTextNode(c) : c);
		}
		return node;
	}
	function download(filename, mime, content) {
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function reportToCsv(r) {
		const lines = ["section,key,value"];
		for (const [key, value] of Object.entries(r.kpis)) lines.push(`kpi,${key},${value}`);
		for (const row of r.topConversations) lines.push(`top_chat,${row.label},${row.value}`);
		return lines.join("\n");
	}
	async function loadWorldMap(highlightCodes) {
		try {
			const url = chrome.runtime.getURL("sites/whatsapp/world-map.json");
			const res = await fetch(url);
			if (!res.ok) return "";
			const data = await res.json();
			const set = new Set(highlightCodes.map((c) => c.toUpperCase()));
			const parts = [];
			for (const [iso, d] of Object.entries(data.paths ?? {})) {
				const fill = set.has(iso) ? "#25d366" : "rgba(128,128,128,0.2)";
				parts.push(`<path d="${d}" fill="${fill}" data-iso="${iso}"/>`);
			}
			return `<svg class="tbx-cp-world" viewBox="0 0 960 500" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
		} catch {
			return "";
		}
	}
	function closeAnalyticsDashboard() {
		document.getElementById(ROOT_ID)?.remove();
	}
	function openAnalyticsDashboard() {
		closeAnalyticsDashboard();
		const root = el$1("div", "tbx-cp-root");
		root.id = ROOT_ID;
		const subtitle = el$1("p", "tbx-cp-subtitle", "Loading…");
		const content = el$1("div", "tbx-cp-content");
		const chipRow = el$1("div", "tbx-cp-chips");
		const fromInput = el$1("input", "tbx-cp-date");
		fromInput.type = "date";
		const toInput = el$1("input", "tbx-cp-date");
		toInput.type = "date";
		const setRange = (range) => {
			currentRange = range;
			for (const btn of chipRow.querySelectorAll("button")) btn.classList.toggle("is-active", btn.dataset.range === (typeof range === "string" ? range : "custom"));
		};
		for (const preset of PRESETS) {
			const label = preset === "all" ? "All" : preset;
			const btn = el$1("button", "tbx-cp-chip", label);
			btn.type = "button";
			btn.dataset.range = preset;
			btn.textContent = label;
			btn.addEventListener("click", () => {
				setRange(preset);
				runLoad();
			});
			chipRow.appendChild(btn);
		}
		const refresh = () => void runLoad();
		const header = el$1("header", "tbx-cp-header", el$1("div", "tbx-cp-header__title", el$1("h1", "", "ChatPulse Analytics"), el$1("span", "tbx-cp-beta", "BETA")), el$1("div", "tbx-cp-toolbar", chipRow, fromInput, toInput, el$1("button", "tbx-cp-btn", "Refresh"), el$1("button", "tbx-cp-btn", "Export JSON"), el$1("button", "tbx-cp-btn", "Export CSV"), el$1("button", "tbx-cp-btn tbx-cp-btn--ghost", "Close")), subtitle);
		const [refreshBtn, jsonBtn, csvBtn, closeBtn] = header.querySelectorAll("button");
		refreshBtn.addEventListener("click", () => {
			if (fromInput.value && toInput.value) setRange({
				from: fromInput.value,
				to: toInput.value
			});
			refresh();
		});
		jsonBtn.addEventListener("click", () => {
			if (!report) return;
			download(`chatpulse-${Date.now()}.json`, "application/json", JSON.stringify(report, null, 2));
		});
		csvBtn.addEventListener("click", () => {
			if (!report) return;
			download(`chatpulse-${Date.now()}.csv`, "text/csv", reportToCsv(report));
		});
		closeBtn.addEventListener("click", () => closeAnalyticsDashboard());
		root.append(header, content);
		document.body.appendChild(root);
		root.addEventListener("click", (e) => {
			if (e.target === root) closeAnalyticsDashboard();
		});
		setRange(currentRange);
		runLoad();
		async function runLoad() {
			subtitle.textContent = "Collecting messages…";
			content.replaceChildren(el$1("div", "tbx-cp-loading", "Analyzing chats…"));
			const dataset = await analyticsMain(currentRange, (msg) => {
				subtitle.textContent = msg;
			});
			if (!dataset) {
				subtitle.textContent = "Could not load data. Is WhatsApp ready?";
				content.replaceChildren(el$1("p", "tbx-cp-muted", "Try refreshing WhatsApp Web and open ChatPulse again."));
				return;
			}
			report = computeReport(dataset, currentRange);
			subtitle.textContent = `Analyzed ${report.meta.messageCount} messages across ${report.meta.chatCount} chats · ${report.meta.rangeLabel}`;
			if (!worldMapCache) worldMapCache = await loadWorldMap(report.countries.map((c) => c.iso2).filter(Boolean));
			content.replaceChildren(renderPanels(report, worldMapCache || void 0));
		}
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
	var CSS_FEATURE_IDS = WHATSAPP_FEATURES.filter((f) => f.impl === "css").map((f) => f.id);
	WHATSAPP_FEATURES.filter((f) => f.impl === "script").map((f) => f.id);
	//#endregion
	//#region src/core/sites/whatsapp/chatExport.ts
	var DEFAULT_CHAT_EXPORT_OPTIONS = {
		format: "html",
		exportChatName: true,
		exportParticipantNames: false,
		exportMedia: true,
		stableMedia: false,
		exportUtcTime: false,
		redactPhoneNumbers: true,
		onlyMyMessages: false,
		excludeMyMessages: false,
		dateFrom: "",
		dateTo: ""
	};
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
		restoreDeletedMessages: {
			label: "Restore deleted messages",
			description: "Show a copy of messages deleted for everyone."
		},
		customChatBackground: {
			label: "Set custom chat background image",
			description: "Use your own wallpaper behind conversations."
		},
		showSideLauncher: {
			label: "Show ChatBoost button in sidebar",
			description: "Green plus button in the left navigation rail."
		},
		chatPulse: {
			label: "ChatPulse Analytics",
			description: "Full messaging dashboard overlay with charts and insights (right-click or drawer)."
		},
		btnStartChat: {
			label: "Start chat with any number",
			description: "Header button to open a chat without saving the contact."
		},
		btnTranslate: {
			label: "Translate message button",
			description: "Translate a message inline on hover."
		},
		btnQuickReply: {
			label: "Quick reply button",
			description: "Insert a saved template from the chat header."
		},
		btnAddTask: {
			label: "Add task button",
			description: "Create a task linked to the open chat."
		},
		btnExportChat: {
			label: "Export chat button",
			description: "Export the open chat to HTML, JSON, Excel, or CSV."
		}
	};
	var WHATSAPP_SECTION_INFO = {
		privacy: {
			label: "Private Mode",
			description: "Anti screen spying and deleted messages"
		},
		custom: {
			label: "Customizations",
			description: "Make WhatsApp yours"
		},
		buttons: {
			label: "Extra Buttons",
			description: "Header and message buttons WhatsApp lacks"
		}
	};
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
	//#region src/chrome/content/sites/whatsapp/store.ts
	var STORAGE_KEY = "whatsappPlus";
	function normalizeState(raw) {
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
		return normalizeState((await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]);
	}
	async function saveState(patch) {
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
		await chrome.storage.local.set({ [STORAGE_KEY]: next });
		return next;
	}
	function uid() {
		return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/exportChatModal.ts
	function downloadFile(filename, mime, content) {
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function fieldCheckbox(label, checked, onChange) {
		const row = document.createElement("label");
		row.className = "tbx-d-export-chat__check";
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = checked;
		input.addEventListener("change", () => onChange(input.checked));
		const span = document.createElement("span");
		span.textContent = label;
		row.append(input, span);
		return row;
	}
	function fieldRadio(name, value, label, checked, onPick) {
		const row = document.createElement("label");
		row.className = "tbx-d-export-chat__radio";
		const input = document.createElement("input");
		input.type = "radio";
		input.name = name;
		input.className = "tbx-d-radio";
		input.value = value;
		input.checked = checked;
		input.addEventListener("change", () => {
			if (input.checked) onPick();
		});
		const span = document.createElement("span");
		span.textContent = label;
		row.append(input, span);
		return row;
	}
	function openExportChatModal(host, notify) {
		host.querySelector(".tbx-d-export-chat-modal")?.remove();
		const opts = { ...DEFAULT_CHAT_EXPORT_OPTIONS };
		let busy = false;
		const close = () => overlay.remove();
		const overlay = document.createElement("div");
		overlay.className = "tbx-d-modal tbx-d-export-chat-modal";
		const box = document.createElement("div");
		box.className = "tbx-d-modal__box tbx-d-modal__box--export-chat";
		const title = document.createElement("h3");
		title.className = "tbx-d-modal__title";
		title.textContent = "Export chat";
		const chatHint = document.createElement("p");
		chatHint.className = "tbx-d-export-chat__hint";
		chatHint.textContent = activeChatTitle() ? `Chat: ${activeChatTitle()}` : "Open a chat in WhatsApp first.";
		const formats = document.createElement("div");
		formats.className = "tbx-d-export-chat__formats";
		for (const [value, label] of [
			["html", "HTML"],
			["json", "JSON"],
			["excel", "Excel"],
			["csv", "CSV"]
		]) formats.appendChild(fieldRadio("tbx-exp-format", value, label, opts.format === value, () => {
			opts.format = value;
		}));
		const optionsWrap = document.createElement("div");
		optionsWrap.className = "tbx-d-export-chat__opts";
		for (const [key, label] of [
			["exportChatName", "Export chat name"],
			["exportParticipantNames", "Export participant names"],
			["exportMedia", "Export media"],
			["stableMedia", "Stable media"],
			["exportUtcTime", "Export UTC time"],
			["redactPhoneNumbers", "Redact phone numbers"],
			["onlyMyMessages", "Only my messages"],
			["excludeMyMessages", "Exclude my messages"]
		]) optionsWrap.appendChild(fieldCheckbox(label, Boolean(opts[key]), (v) => {
			opts[key] = v;
		}));
		const dateRow = document.createElement("div");
		dateRow.className = "tbx-d-export-chat__dates";
		const from = document.createElement("input");
		from.type = "date";
		from.className = "tbx-d-input";
		from.addEventListener("change", () => {
			opts.dateFrom = from.value;
		});
		const to = document.createElement("input");
		to.type = "date";
		to.className = "tbx-d-input";
		to.addEventListener("change", () => {
			opts.dateTo = to.value;
		});
		const dateLabel = document.createElement("span");
		dateLabel.className = "tbx-d-export-chat__date-label";
		dateLabel.textContent = "Date range";
		dateRow.append(dateLabel, from, document.createTextNode("–"), to);
		const actions = document.createElement("div");
		actions.className = "tbx-d-form__actions";
		const cancel = document.createElement("button");
		cancel.type = "button";
		cancel.className = "tbx-d-btn tbx-d-btn--ghost";
		cancel.textContent = "Cancel";
		cancel.addEventListener("click", close);
		const exportBtn = document.createElement("button");
		exportBtn.type = "button";
		exportBtn.className = "tbx-d-btn tbx-d-btn--primary";
		exportBtn.textContent = "Export";
		exportBtn.addEventListener("click", () => {
			if (busy) return;
			if (!activeChatTitle()) return notify("Open a chat first");
			busy = true;
			exportBtn.disabled = true;
			notify("Exporting chat…");
			exportChatMain(opts).then((file) => {
				if (!file) return notify("Could not export (is WhatsApp fully loaded?)");
				downloadFile(file.filename, file.mime, file.content);
				notify("Chat exported");
				close();
			}).finally(() => {
				busy = false;
				exportBtn.disabled = false;
			});
		});
		actions.append(cancel, exportBtn);
		box.append(title, chatHint, formats, optionsWrap, dateRow, actions);
		overlay.appendChild(box);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) close();
		});
		host.appendChild(overlay);
		exportBtn.focus();
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/buttons.ts
	var observer = null;
	var currentState = null;
	var ICONS$1 = {
		startChat: "M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z",
		quickReply: "M7 2v11h3v9l7-12h-4l4-8z",
		addTask: "M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z",
		translate: "m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",
		exportChat: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5zM19 3h-4v2h4v4h2V5c0-1.1-.9-2-2-2z"
	};
	function svgIcon(path, size = 22) {
		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", String(size));
		svg.setAttribute("height", String(size));
		svg.setAttribute("aria-hidden", "true");
		const p = document.createElementNS(ns, "path");
		p.setAttribute("d", path);
		p.setAttribute("fill", "currentColor");
		svg.appendChild(p);
		return svg;
	}
	var toastTimer$1 = null;
	function pageToast(message) {
		document.querySelector(".tbx-wa-toast")?.remove();
		const t = document.createElement("div");
		t.className = "tbx-wa-toast";
		t.textContent = message;
		document.body.appendChild(t);
		if (toastTimer$1) clearTimeout(toastTimer$1);
		toastTimer$1 = setTimeout(() => t.remove(), 2600);
	}
	function closePopover() {
		document.querySelector(".tbx-wa-popover")?.remove();
		document.removeEventListener("mousedown", onOutside, true);
	}
	function onOutside(e) {
		const pop = document.querySelector(".tbx-wa-popover");
		if (pop && !pop.contains(e.target)) closePopover();
	}
	function openPopover(anchor, title, content) {
		closePopover();
		const pop = document.createElement("div");
		pop.className = "tbx-wa-popover";
		const h = document.createElement("div");
		h.className = "tbx-wa-popover__title";
		h.textContent = title;
		pop.append(h, content);
		document.body.appendChild(pop);
		const r = anchor.getBoundingClientRect();
		const w = pop.offsetWidth;
		pop.style.top = `${Math.round(r.bottom + 8)}px`;
		pop.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)))}px`;
		pop.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				closePopover();
			}
		});
		setTimeout(() => document.addEventListener("mousedown", onOutside, true), 0);
		pop.querySelector("input, button")?.focus();
	}
	function inputForm(placeholder, submitLabel, onSubmit, type = "text") {
		const form = document.createElement("form");
		form.className = "tbx-wa-popover__form";
		const input = document.createElement("input");
		input.className = "tbx-wa-popover__input";
		input.type = type;
		input.placeholder = placeholder;
		const btn = document.createElement("button");
		btn.type = "submit";
		btn.className = "tbx-wa-popover__btn";
		btn.textContent = submitLabel;
		form.append(input, btn);
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const v = input.value.trim();
			if (!v) return input.focus();
			closePopover();
			onSubmit(v);
		});
		return form;
	}
	function quickReplyList() {
		const list = document.createElement("div");
		list.className = "tbx-wa-popover__list";
		const templates = currentState?.data.templates ?? [];
		if (!templates.length) {
			const empty = document.createElement("p");
			empty.className = "tbx-wa-popover__empty";
			empty.textContent = "No templates yet. Add them in ChatBoost → Business Tools → Message Templates.";
			list.appendChild(empty);
			return list;
		}
		for (const t of templates) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = "tbx-wa-popover__item";
			const name = document.createElement("strong");
			name.textContent = t.name;
			const body = document.createElement("span");
			body.textContent = t.body;
			item.append(name, body);
			item.addEventListener("click", () => {
				closePopover();
				if (!insertIntoComposer(applyTemplateVariables(t.body, { name: activeChatTitle() }))) pageToast("Open a chat first");
			});
			list.appendChild(item);
		}
		return list;
	}
	async function addTask(title) {
		const s = await loadState();
		const chat = activeChatTitle();
		await saveState({ data: { tasks: [{
			id: uid(),
			title,
			chatLabel: chat || void 0,
			done: false,
			createdAt: Date.now()
		}, ...s.data.tasks] } });
		pageToast("Task added");
	}
	function injectHeaderButtons(state) {
		const header = document.querySelector("#main header") ?? document.querySelector("[data-testid=\"conversation-header\"]");
		if (!header || header.querySelector(".tbx-wa-header-actions")) return;
		const wrap = document.createElement("div");
		wrap.className = "tbx-wa-header-actions";
		const add = (iconPath, title, onClick) => {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "tbx-wa-hdr-btn";
			b.title = title;
			b.setAttribute("aria-label", title);
			b.appendChild(svgIcon(iconPath));
			b.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick(b);
			});
			wrap.appendChild(b);
		};
		const v = state.values;
		if (isFeatureOn(v, "btnStartChat")) add(ICONS$1.startChat, "Start new chat", (btn) => openPopover(btn, "Start a chat with any number", inputForm("Phone number with country code", "Chat", (num) => {
			const digits = num.replace(/\D/g, "");
			if (digits.length < 6) return pageToast("Enter a valid phone number");
			postToMain("startChat", { number: digits });
		}, "tel")));
		if (isFeatureOn(v, "btnQuickReply")) add(ICONS$1.quickReply, "Quick replies", (btn) => openPopover(btn, "Quick replies", quickReplyList()));
		if (isFeatureOn(v, "btnExportChat")) add(ICONS$1.exportChat, "Export chat", () => {
			openExportChatModal(document.querySelector("#tbx-wa-drawer") ?? document.body, pageToast);
		});
		if (isFeatureOn(v, "btnAddTask")) add(ICONS$1.addTask, "Add task", (btn) => openPopover(btn, "Add a task for this chat", inputForm("Follow up about…", "Add", (t) => void addTask(t))));
		if (!wrap.childElementCount) return;
		const actions = header.lastElementChild;
		if (actions && actions !== wrap) header.insertBefore(wrap, actions);
		else header.appendChild(wrap);
	}
	async function translateText(text, target) {
		const g = globalThis;
		if (g.Translator && g.LanguageDetector) try {
			const source = (await (await g.LanguageDetector.create()).detect(text))[0]?.detectedLanguage;
			if (source && source !== "und") {
				if (source === target) return text;
				return await (await g.Translator.create({
					sourceLanguage: source,
					targetLanguage: target
				})).translate(text);
			}
		} catch {}
		const res = await chrome.runtime.sendMessage({
			type: "WA_TRANSLATE",
			text,
			target
		});
		if (!res?.ok || !res.data?.text) throw new Error("translate failed");
		return res.data.text;
	}
	async function toggleTranslation(row, btn) {
		const existing = row.querySelector(".tbx-wa-translation");
		if (existing) {
			existing.remove();
			return;
		}
		const text = row.querySelector(".selectable-text, [data-testid=\"selectable-text\"]")?.textContent?.trim() ?? "";
		if (!text) return pageToast("Nothing to translate in this message");
		const target = (navigator.language || "en").split("-")[0];
		btn.classList.add("is-busy");
		try {
			const translated = await translateText(text, target);
			const box = document.createElement("div");
			box.className = "tbx-wa-translation";
			const label = document.createElement("span");
			label.className = "tbx-wa-translation__label";
			label.textContent = `Translated · ${target.toUpperCase()}`;
			const body = document.createElement("div");
			body.textContent = translated;
			box.append(label, body);
			(row.querySelector(".copyable-text") ?? row).appendChild(box);
		} catch {
			pageToast("Could not translate this message right now");
		} finally {
			btn.classList.remove("is-busy");
		}
	}
	function msgButton(content, title, onClick) {
		const b = document.createElement("button");
		b.type = "button";
		b.className = "tbx-wa-extra-btn";
		b.title = title;
		b.setAttribute("aria-label", title);
		b.append(content);
		b.addEventListener("click", (e) => {
			e.stopPropagation();
			onClick(b);
		});
		return b;
	}
	function injectMessageButtons(state) {
		const v = state.values;
		if (!isFeatureOn(v, "btnTranslate")) return;
		document.querySelectorAll("[data-testid=\"msg-container\"]:not([data-tbx-wa-btn])").forEach((row) => {
			row.setAttribute("data-tbx-wa-btn", "1");
			if (row.querySelector(":scope > .tbx-wa-msg-actions")) return;
			const bar = document.createElement("span");
			bar.className = `tbx-wa-msg-actions ${(row.closest("[data-id]")?.getAttribute("data-id") ?? "").startsWith("true_") || Boolean(row.closest(".message-out")) ? "is-out" : "is-in"}`;
			if (row.querySelector(".selectable-text, [data-testid=\"selectable-text\"]")) bar.appendChild(msgButton(svgIcon(ICONS$1.translate, 18), "Translate", (b) => void toggleTranslation(row, b)));
			if (bar.childElementCount) row.appendChild(bar);
		});
	}
	function startButtons(state) {
		stopButtons();
		currentState = state;
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
		closePopover();
		document.querySelectorAll(".tbx-wa-header-actions, .tbx-wa-msg-actions, .tbx-wa-translation").forEach((el) => el.remove());
		document.querySelectorAll("[data-tbx-wa-btn]").forEach((el) => el.removeAttribute("data-tbx-wa-btn"));
	}
	//#endregion
	//#region src/chrome/content/sites/whatsapp/features/drawer.ts
	var DRAWER_ID = "tbx-wa-drawer";
	var OPEN_ATTR = "data-tbx-wa-drawer-open";
	var BULK_EXCLUDED = /* @__PURE__ */ new Set(["showSideLauncher"]);
	var ICONS = {
		tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
		dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
		download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
		chart: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
		insights: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
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
		home: "ChatBoost",
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
	async function patchState(patch) {
		state = await saveState(patch);
		render("none");
	}
	function confirmDialog(title, message, okLabel) {
		return new Promise((resolve) => {
			if (!drawer) return resolve(false);
			const close = (result) => {
				overlay.classList.add("is-closing");
				setTimeout(() => overlay.remove(), 150);
				resolve(result);
			};
			const ok = textButton(okLabel, () => close(true), "danger");
			const overlay = el("div", "tbx-d-modal", el("div", "tbx-d-modal__box", el("h3", "tbx-d-modal__title", title), el("p", "tbx-d-modal__text", message), el("div", "tbx-d-form__actions", textButton("Cancel", () => close(false), "ghost"), ok)));
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) close(false);
			});
			drawer.appendChild(overlay);
			ok.focus();
		});
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
		return el("div", "tbx-d-list", navRow("tune", "Enhancements", "Enhance your WhatsApp privacy and productivity.", () => go("enhancements")), navRow("dashboard", "Business Tools", "Accelerate daily tasks with smart business solutions.", () => go("business")), navRow("download", "Exporting", "Easily save and manage your WhatsApp data.", () => go("export")), navRow("chart", "Statistics", "Gain valuable insights from your data.", () => go("stats")), navRow("insights", "ChatPulse Analytics", "Full messaging dashboard with charts and trends.", () => {
			if (!isFeatureOn(s.values, "chatPulse")) return toast("Enable ChatPulse in Enhancements");
			openAnalyticsDashboard();
		}), navRow("more", "More…", "Open the full panel, hide the button or turn off.", () => go("more")), el("p", "tbx-d-hint", `${countActiveFeatures(s)} features active`));
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
			const src = URL.createObjectURL(f);
			const img = new Image();
			img.onload = () => {
				URL.revokeObjectURL(src);
				let scale = Math.min(1, 1920 / Math.max(img.width, img.height));
				let url = "";
				for (let i = 0; i < 5; i++) {
					const canvas = document.createElement("canvas");
					canvas.width = Math.max(1, Math.round(img.width * scale));
					canvas.height = Math.max(1, Math.round(img.height * scale));
					canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
					url = canvas.toDataURL("image/jpeg", .85);
					if (url.length < 25e5) break;
					scale *= .75;
				}
				if (url.length >= 25e5) return toast("Image is too large. Pick a smaller one.");
				patchState({ data: { chatBackgroundDataUrl: url } }).then(() => toast("Background updated"));
			};
			img.onerror = () => {
				URL.revokeObjectURL(src);
				toast("Could not read that image");
			};
			img.src = src;
		});
		const hasImage = Boolean(state?.data.chatBackgroundDataUrl);
		return el("div", "tbx-d-subcontrols", file, textButton(hasImage ? "Change image" : "Choose image", () => file.click(), "ghost"), hasImage ? textButton("Remove", () => void patchState({ data: { chatBackgroundDataUrl: "" } }), "ghost") : null);
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
		const chatExportRow = el("button", "tbx-d-card tbx-d-card--clickable", el("span", "tbx-d-export__icon", icon("download")), el("div", "tbx-d-card__main", el("div", "tbx-d-card__title", "Export chat"), el("div", "tbx-d-card__body", "Save the open chat as HTML, JSON, Excel, or CSV.")), icon("chevron", 20));
		chatExportRow.type = "button";
		chatExportRow.addEventListener("click", () => {
			if (drawer) openExportChatModal(drawer, toast);
		});
		return el("div", "tbx-d-view", heading("Exporting", iconButton("download", "Download CSV", () => void run())), el("div", "tbx-d-cards", chatExportRow), el("div", "tbx-d-exports", contactRow, simple("groups", "group", "Groups"), simple("labels", "label", "Labels"), simple("countries", "flag", "Countries")), el("p", "tbx-d-hint", "Pick what to export, then tap the download icon to save a CSV file."));
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
		}), navRow("power", "Turn off ChatBoost", "Disable every ChatBoost feature on this site.", () => {
			confirmDialog("Turn off ChatBoost?", "You can turn it on again from Browser Toolbox.", "Turn off").then((yes) => {
				if (yes) patchState({ enabled: false });
			});
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
		const title = el("div", "tbx-d-header__title", el("span", "", "ChatBoost"), el("sup", "tbx-d-header__ver", "for WhatsApp"));
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
		if (area !== "local" || !changes["whatsappPlus"] || !drawer) return;
		const next = normalizeState(changes[STORAGE_KEY].newValue);
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
		btn.title = "ChatBoost";
		btn.setAttribute("aria-label", "ChatBoost");
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
		const on = isFeatureOn(state.values, "customChatBackground");
		const url = state.data.chatBackgroundDataUrl;
		if (on && url && url.length < 25e5) {
			root.setAttribute(featureAttrName("customChatBackground"), "true");
			root.style.setProperty("--tbx-wa-bg", `url("${url.replace(/"/g, "")}")`);
		} else {
			root.removeAttribute(featureAttrName("customChatBackground"));
			root.style.removeProperty("--tbx-wa-bg");
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
		document.querySelectorAll("#tbx-wa-launcher, .tbx-wa-launcher, .tbx-wa-header-actions, .tbx-wa-msg-actions, .tbx-wa-extra-btn, .tbx-wa-translation, .tbx-wa-popover, .tbx-wa-toast, .tbx-wa-restored-msg").forEach((el) => el.remove());
		root.style.removeProperty("--tbx-wa-bg");
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
				if (msg?.type === "WA_EXPORT_CHAT" && msg.options) {
					const onResult = (payload) => {
						window.removeEventListener("message", listener);
						sendResponse({
							ok: true,
							file: payload?.file ?? null
						});
					};
					const listener = (e) => {
						if (e.source !== window) return;
						const data = e.data;
						if (data && data["__toolboxWaEvt"] === "exportChatResult") onResult(data.payload);
					};
					window.addEventListener("message", listener);
					postToMain("exportChat", {
						reqId: `panel-${Date.now()}`,
						options: msg.options
					});
					setTimeout(() => sendResponse({
						ok: false,
						file: null
					}), 6e4);
					return true;
				}
				if (msg?.type === "WA_OPEN_ANALYTICS") {
					chrome.storage.local.get("whatsappPlus", (result) => {
						const state = readState(result.whatsappPlus);
						if (!state?.enabled || !isFeatureOn(state.values, "chatPulse")) {
							const t = document.createElement("div");
							t.className = "tbx-wa-toast";
							t.textContent = "Enable ChatPulse in ChatBoost";
							document.body.appendChild(t);
							setTimeout(() => t.remove(), 2600);
							return;
						}
						openAnalyticsDashboard();
					});
					sendResponse({ ok: true });
					return true;
				}
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
