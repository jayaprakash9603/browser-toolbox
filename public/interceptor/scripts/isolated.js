(function() {
	//#region src/core/interceptor/constants.ts
	var INTERCEPTOR_PAGE_CONFIG_KEY = "interceptorPageConfig";
	var PAGE_MESSAGE_KEY = "__toolboxInterceptor";
	var PAGE_COMMAND_KEY = "__toolboxInterceptorCmd";
	//#endregion
	//#region src/chrome/content/interceptor/isolated.ts
	function loadConfig() {
		return [];
	}
	var config = loadConfig();
	var showToast = false;
	var TOAST_STACK = "tbx-interceptor-toasts";
	function toastActionLabel(kind, ruleType) {
		if (kind === "blocked") return "Request blocked";
		if (kind === "redirected") return "Request redirected";
		if (kind === "mock") return "Mocked response";
		if (kind === "response") return "Response modified";
		if (kind === "request") return "Request modified";
		if (kind === "delay") return "Request delayed";
		if (ruleType === "cancel") return "Request blocked";
		return "Rule applied";
	}
	function showRuleToast(payload) {
		if (!showToast) return;
		let stack = document.getElementById(TOAST_STACK);
		if (!stack) {
			stack = document.createElement("div");
			stack.id = TOAST_STACK;
			stack.setAttribute("style", "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 32px));pointer-events:none");
			document.documentElement.appendChild(stack);
		}
		const kind = payload.kind ?? "matched";
		const ruleType = payload.ruleType ?? "";
		const accent = kind === "blocked" || ruleType === "cancel" ? "#ef4444" : "#3b82f6";
		const card = document.createElement("div");
		const short = payload.url.length > 56 ? `${payload.url.slice(0, 53)}…` : payload.url;
		card.setAttribute("style", `pointer-events:auto;padding:10px 12px;background:#0f172a;color:#f8fafc;font:12px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);border-left:4px solid ${accent}`);
		card.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${accent}">Rule applied</span></div><div style="font-weight:600">${toastActionLabel(kind, ruleType)}</div><div style="opacity:.9">${payload.ruleName || ruleType || "Interceptor rule"}</div><div style="opacity:.65;margin-top:4px;word-break:break-all">${short}</div>`;
		stack.appendChild(card);
		window.setTimeout(() => card.remove(), 4500);
	}
	chrome.runtime.onMessage.addListener((message) => {
		if (message?.type === "INTERCEPTOR_CONFIG") {
			config = message.config;
			showToast = Boolean(message.showToast);
			window.postMessage({
				[PAGE_COMMAND_KEY]: "config",
				config,
				showToast
			}, window.location.origin || "*");
		}
		if (message?.type === "INTERCEPTOR_RULE_TOAST" && message.url) showRuleToast({
			ruleName: message.ruleName,
			ruleType: message.ruleType,
			kind: message.kind,
			url: String(message.url)
		});
	});
	chrome.storage.session.get(INTERCEPTOR_PAGE_CONFIG_KEY).then((session) => {
		const stored = session[INTERCEPTOR_PAGE_CONFIG_KEY];
		if (stored?.length) {
			config = stored;
			window.postMessage({
				[PAGE_COMMAND_KEY]: "config",
				config,
				showToast
			}, window.location.origin || "*");
		}
	});
	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		const data = event.data;
		if (!data || typeof data !== "object" || !data["__toolboxInterceptor"]) return;
		const payload = data[PAGE_MESSAGE_KEY];
		chrome.runtime.sendMessage({
			type: "INTERCEPTOR_PAGE_EVENT",
			event: payload
		});
	});
	//#endregion
})();
