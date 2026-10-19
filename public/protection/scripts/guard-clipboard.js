(function() {
	//#region src/core/protection/heuristics.ts
	/**
	* Commands that "fake CAPTCHA / ClickFix" pages copy to the clipboard and then ask the user
	* to paste into Win+R, Terminal or PowerShell.
	*/
	var SHELL_COMMAND_PATTERNS = [
		/\b(powershell|pwsh)(\.exe)?\b/i,
		/\bcmd(\.exe)?\s+\/[ck]\b/i,
		/\b(mshta|rundll32|regsvr32|certutil|bitsadmin|wscript|cscript|msiexec)(\.exe)?\b/i,
		/\b(iex|invoke-expression|invoke-webrequest|iwr|downloadstring|frombase64string|start-process)\b/i,
		/-e(nc(odedcommand)?)?\s+[a-z0-9+/=]{20,}/i,
		/\b(curl|wget)\b[^\n|]*\|\s*(ba|z)?sh\b/i,
		/\bbash\s+-c\b/i,
		/\bosascript\b/i,
		/\bbase64\s+(-d|--decode)\b[^\n]*\|/i
	];
	function looksLikeShellCommand(text) {
		const sample = text.slice(0, 4e3);
		return SHELL_COMMAND_PATTERNS.some((re) => re.test(sample));
	}
	//#endregion
	//#region src/core/protection/constants.ts
	/** Message key the page-world guards use to talk to the isolated protection script. */
	var PAGE_MESSAGE_KEY = "__toolboxProtection";
	//#endregion
	//#region src/chrome/content/protection/pageBridge.ts
	/** Page-world guards cannot reach chrome.*; the isolated protection script relays this. */
	function signalIsolated(kind) {
		try {
			window.postMessage({ [PAGE_MESSAGE_KEY]: kind }, window.location.origin || "*");
		} catch {}
	}
	//#endregion
	//#region src/chrome/content/protection/guard-clipboard.ts
	/**
	* Page world, document_start. Stops "ClickFix" / fake-CAPTCHA attacks: the page silently
	* copies a PowerShell or shell command and tells the user to press Win+R and paste it.
	*
	* A copy is only blocked when the text looks like a shell command AND it is not visibly shown
	* on the page, so "copy" buttons next to install instructions keep working.
	*/
	var MAX_SCAN_NODES = 5e3;
	function isRendered(el) {
		if (!el) return false;
		const rect = el.getBoundingClientRect();
		if (rect.width < 4 || rect.height < 4) return false;
		const style = getComputedStyle(el);
		return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > .1;
	}
	/** True when the command is printed somewhere the user can actually read it. */
	function isVisibleOnPage(text) {
		const needle = text.trim().slice(0, 48);
		if (!needle || !document.body) return false;
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		let scanned = 0;
		for (let node = walker.nextNode(); node && scanned < MAX_SCAN_NODES; node = walker.nextNode()) {
			scanned++;
			if (node.textContent?.includes(needle) && isRendered(node.parentElement)) return true;
		}
		return false;
	}
	function shouldBlock(text) {
		if (!looksLikeShellCommand(text)) return false;
		if (isVisibleOnPage(text)) return false;
		signalIsolated("clipboard");
		return true;
	}
	function patchClipboardApi() {
		const proto = window.Clipboard?.prototype;
		if (!proto) return;
		const nativeWriteText = proto.writeText;
		proto.writeText = function(text) {
			if (shouldBlock(String(text))) return Promise.resolve();
			return nativeWriteText.call(this, text);
		};
		const nativeWrite = proto.write;
		if (nativeWrite) proto.write = async function(items) {
			for (const item of items) {
				if (!item.types.includes("text/plain")) continue;
				if (shouldBlock(await (await item.getType("text/plain")).text())) return;
			}
			return nativeWrite.call(this, items);
		};
	}
	function selectedText() {
		const active = document.activeElement;
		if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
			const { selectionStart, selectionEnd, value } = active;
			if (selectionStart != null && selectionEnd != null && selectionEnd > selectionStart) return value.slice(selectionStart, selectionEnd);
		}
		return window.getSelection()?.toString() ?? "";
	}
	function patchExecCommand() {
		const native = Document.prototype.execCommand;
		Document.prototype.execCommand = function(command, showUI, value) {
			if (command.toLowerCase() === "copy" && shouldBlock(selectedText())) return false;
			return native.call(this, command, showUI, value);
		};
	}
	function patchSetData() {
		const native = DataTransfer.prototype.setData;
		DataTransfer.prototype.setData = function(format, data) {
			if (/^text(\/plain)?$/i.test(format) && shouldBlock(String(data))) return;
			native.call(this, format, data);
		};
	}
	var guarded = window;
	if (!guarded.__toolboxClipboardGuard) {
		guarded.__toolboxClipboardGuard = true;
		patchClipboardApi();
		patchExecCommand();
		patchSetData();
	}
	//#endregion
})();
