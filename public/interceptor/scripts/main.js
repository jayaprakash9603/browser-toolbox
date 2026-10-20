(function() {
	//#region src/core/interceptor/constants.ts
	var PAGE_MESSAGE_KEY = "__toolboxInterceptor";
	var USER_AGENT_PRESETS = {
		chromeDesktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		chromeAndroid: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
		safariIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		firefoxDesktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0"
	};
	//#endregion
	//#region src/chrome/content/interceptor/main.ts
	function matchSource(url, source) {
		try {
			const parsed = new URL(url);
			const hay = source.field === "host" ? parsed.host : source.field === "path" ? `${parsed.pathname}${parsed.search}` : url;
			const needle = source.value;
			if (!needle) return false;
			switch (source.operator) {
				case "equals": return hay.toLowerCase() === needle.toLowerCase();
				case "contains": return hay.toLowerCase().includes(needle.toLowerCase());
				case "wildcard": {
					const escaped = needle.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
					return new RegExp(`^${escaped}$`, "i").test(hay);
				}
				case "regex": return new RegExp(needle, "i").test(hay);
				default: return false;
			}
		} catch {
			return false;
		}
	}
	function matchRule(rule, url, method, body) {
		if (!rule.sources.some((s) => matchSource(url, s))) return false;
		const f = rule.filters;
		if (f?.methods?.length && !f.methods.map((m) => m.toUpperCase()).includes(method.toUpperCase())) return false;
		if (f?.payloadKey && body) try {
			const parsed = JSON.parse(body);
			if (f.payloadValue && String(parsed[f.payloadKey]) !== f.payloadValue) return false;
		} catch {
			if (!body.includes(f.payloadKey)) return false;
		}
		if (rule.type === "mockGraphql") {
			const op = rule.payload.operationName;
			const q = rule.payload.queryContains;
			if (body) try {
				const gql = JSON.parse(body);
				if (op && gql.operationName !== op) return false;
				if (q && !(gql.query ?? "").includes(q)) return false;
			} catch {
				return false;
			}
		}
		return true;
	}
	var rules = [];
	var showToast = false;
	var queue = [];
	var TOAST_STACK = "tbx-interceptor-toasts";
	function flushQueue() {
		while (queue.length) queue.shift()?.();
	}
	function actionLabel(kind, ruleType) {
		if (kind === "mock") return "Mocked response";
		if (kind === "response") return "Response modified";
		if (kind === "request") return "Request modified";
		if (kind === "delay") return "Request delayed";
		if (kind === "userAgent") return "User-Agent changed";
		if (kind === "blocked" || ruleType === "cancel") return "Request blocked";
		return "Rule applied";
	}
	function showRuleToastPayload(url, kind, ruleName, ruleType) {
		if (!showToast) return;
		let stack = document.getElementById(TOAST_STACK);
		if (!stack) {
			stack = document.createElement("div");
			stack.id = TOAST_STACK;
			stack.setAttribute("style", "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 32px));pointer-events:none");
			document.documentElement.appendChild(stack);
		}
		const card = document.createElement("div");
		const short = url.length > 56 ? `${url.slice(0, 53)}…` : url;
		const accent = kind === "blocked" || ruleType === "cancel" ? "#ef4444" : "#3b82f6";
		card.setAttribute("style", `pointer-events:auto;padding:10px 12px;background:#0f172a;color:#f8fafc;font:12px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);border-left:4px solid ${accent}`);
		card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${accent}">Rule applied</span></div><div style="font-weight:600">${actionLabel(kind, ruleType)}</div><div style="opacity:.9">${ruleName || ruleType}</div><div style="opacity:.65;margin-top:4px;word-break:break-all">${short}</div>`;
		stack.appendChild(card);
		window.setTimeout(() => card.remove(), 4500);
	}
	function showRuleToast(rule, kind, url) {
		showRuleToastPayload(url, kind, rule.name || rule.type, rule.type);
	}
	function relay(kind, rule, url, method, extra) {
		showRuleToast(rule, kind, url);
		window.postMessage({ [PAGE_MESSAGE_KEY]: {
			kind,
			ruleId: rule.id,
			ruleName: rule.name,
			ruleType: rule.type,
			url,
			method,
			...extra
		} }, window.location.origin || "*");
	}
	function applyUserAgent(rule) {
		const preset = rule.payload.preset;
		const custom = rule.payload.customValue;
		const ua = preset && preset !== "custom" && preset in USER_AGENT_PRESETS ? USER_AGENT_PRESETS[preset] : custom;
		if (!ua) return;
		try {
			Object.defineProperty(navigator, "userAgent", {
				get: () => ua,
				configurable: true
			});
		} catch {}
	}
	function installFetch() {
		const native = window.fetch.bind(window);
		window.fetch = async (input, init) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
			let body = init?.body ? String(init.body) : void 0;
			const matched = [...rules].filter((r) => matchRule(r, url, method, body)).sort((a, b) => b.priority - a.priority);
			for (const rule of matched) {
				if (rule.type === "userAgent") {
					applyUserAgent(rule);
					relay("userAgent", rule, url, method, {});
				}
				if (rule.type === "modifyRequestBody" && body) {
					const fn = rule.payload.functionBody;
					if (fn) try {
						body = new Function("body", "url", "method", fn)(body, url, method);
					} catch {}
					else if (rule.payload.body) body = String(rule.payload.body);
					relay("request", rule, url, method, { requestBody: body });
				}
				if (rule.type === "delay") {
					const ms = Number(rule.payload.delayMs) || 0;
					if (ms > 0) {
						relay("delay", rule, url, method, { delayMs: ms });
						await new Promise((r) => setTimeout(r, ms));
					}
				}
				if (rule.type === "mockApi" || rule.type === "mockGraphql") {
					const status = Number(rule.payload.status) || 200;
					const responseBody = String(rule.payload.body ?? "");
					relay("mock", rule, url, method, {
						responseBody,
						status
					});
					return new Response(responseBody, {
						status,
						headers: { "Content-Type": String(rule.payload.contentType ?? "application/json") }
					});
				}
			}
			const response = await native(input, init);
			for (const rule of matched) {
				if (rule.type === "statusCode") {
					const status = Number(rule.payload.status) || response.status;
					relay("response", rule, url, method, { status });
					return new Response(response.body, {
						status,
						headers: response.headers
					});
				}
				if (rule.type === "modifyResponse") {
					const text = await response.clone().text();
					let next = text;
					const fn = rule.payload.functionBody;
					if (fn) try {
						next = new Function("body", "url", "method", fn)(text, url, method);
					} catch {
						next = text;
					}
					else if (rule.payload.body) next = String(rule.payload.body);
					const status = Number(rule.payload.status) || response.status;
					relay("response", rule, url, method, {
						responseBody: next,
						status
					});
					return new Response(next, {
						status,
						headers: response.headers
					});
				}
			}
			return response;
		};
	}
	function installXhr() {
		const XHR = XMLHttpRequest;
		const open = XHR.prototype.open;
		const send = XHR.prototype.send;
		XHR.prototype.open = function(method, url, ...rest) {
			this.__tbxUrl = typeof url === "string" ? url : url.href;
			this.__tbxMethod = method;
			return open.apply(this, [
				method,
				url,
				...rest
			]);
		};
		XHR.prototype.send = function(body) {
			const url = this.__tbxUrl ?? "";
			const method = this.__tbxMethod ?? "GET";
			const bodyStr = body ? String(body) : void 0;
			const mock = [...rules].filter((r) => matchRule(r, url, method, bodyStr)).sort((a, b) => b.priority - a.priority).find((r) => r.type === "mockApi" || r.type === "mockGraphql");
			if (mock) {
				const status = Number(mock.payload.status) || 200;
				const responseBody = String(mock.payload.body ?? "");
				Object.defineProperty(this, "readyState", { value: 4 });
				Object.defineProperty(this, "status", { value: status });
				Object.defineProperty(this, "responseText", { value: responseBody });
				Object.defineProperty(this, "response", { value: responseBody });
				relay("mock", mock, url, method, {
					responseBody,
					status
				});
				this.dispatchEvent(new Event("readystatechange"));
				this.dispatchEvent(new Event("load"));
				return;
			}
			return send.call(this, body);
		};
	}
	installFetch();
	installXhr();
	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		const data = event.data;
		if (!data || typeof data["__toolboxInterceptorCmd"] !== "string") return;
		if (data["__toolboxInterceptorCmd"] === "toast") {
			const p = data.payload;
			if (p?.url) showRuleToastPayload(p.url, p.kind ?? "matched", p.ruleName ?? "", p.ruleType ?? "");
			return;
		}
		if (data["__toolboxInterceptorCmd"] !== "config") return;
		rules = data.config ?? [];
		showToast = Boolean(data.showToast);
		flushQueue();
		if (showToast && rules.length) {
			const boot = document.createElement("div");
			boot.textContent = `HTTP Interceptor enabled · ${rules.length} page rule(s) active`;
			boot.setAttribute("style", "position:fixed;bottom:16px;right:16px;z-index:2147483646;padding:8px 12px;background:#1e293b;color:#fff;font:12px system-ui;border-radius:8px;opacity:0.92");
			document.documentElement.appendChild(boot);
			window.setTimeout(() => boot.remove(), 3500);
		}
	});
	//#endregion
})();
