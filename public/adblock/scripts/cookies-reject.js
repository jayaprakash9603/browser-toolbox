(function() {
	//#region src/chrome/content/adblock/cookies-reject.ts
	var GIVE_UP_MS = 15e3;
	/** Reject buttons of common consent management platforms. */
	var CMP_REJECT_SELECTORS = [
		"#onetrust-reject-all-handler",
		".ot-pc-refuse-all-handler",
		"#CybotCookiebotDialogBodyButtonDecline",
		"#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
		"#didomi-notice-disagree-button",
		".didomi-continue-without-agreeing",
		".qc-cmp2-summary-buttons button[mode=\"secondary\"]",
		".cky-btn-reject",
		".cmplz-deny",
		".osano-cm-denyAll",
		".osano-cm-button--type_denyAll",
		"#truste-consent-required",
		".t-declineAllButton",
		"[data-tid=\"banner-decline\"]",
		".fc-cta-do-not-consent",
		".sp_choice_type_REJECT_ALL",
		"#tarteaucitronAllDenied2",
		".iubenda-cs-reject-btn",
		".cc-deny",
		"#hs-eu-decline-button",
		"button[data-cookiefirst-action=\"reject\"]",
		".moove-gdpr-infobar-reject-btn",
		"#cookie_action_close_header_reject",
		".cookie-notice-reject, #cn-refuse-cookie",
		"button[aria-label=\"Reject all\"]",
		"button[aria-label=\"Decline all\"]"
	];
	var CONSENT_CONTAINER = "[id*=\"cookie\" i], [class*=\"cookie\" i], [id*=\"consent\" i], [class*=\"consent\" i], [id*=\"gdpr\" i], [class*=\"gdpr\" i], [aria-label*=\"cookie\" i], [aria-label*=\"consent\" i]";
	var REJECT_TEXT = /^(reject|decline|refuse|deny|disagree)( all| all cookies| cookies| optional cookies| non-essential( cookies)?)?$|^(only|use) (necessary|essential|required)( cookies)?( only)?$|^(continue|proceed) without (accepting|agreeing)$|^(alle )?ablehnen$|^tout refuser$|^rechazar( todo)?$|^rifiuta( tutto)?$|^weigeren$/i;
	function isVisible(el) {
		const rect = el.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}
	function findCmpButton() {
		for (const selector of CMP_REJECT_SELECTORS) {
			const el = document.querySelector(selector);
			if (el && isVisible(el)) return el;
		}
		return null;
	}
	function findTextButton() {
		const containers = document.querySelectorAll(CONSENT_CONTAINER);
		for (const container of containers) {
			const buttons = container.querySelectorAll("button, a[role=\"button\"], [role=\"button\"], input[type=\"button\"]");
			for (const button of buttons) {
				const label = (button.textContent || button.value || "").trim().replace(/\s+/g, " ");
				if (label.length <= 40 && REJECT_TEXT.test(label) && isVisible(button)) return button;
			}
		}
		return null;
	}
	function start() {
		let done = false;
		const tryReject = () => {
			if (done) return;
			const button = findCmpButton() ?? findTextButton();
			if (!button) return;
			done = true;
			observer.disconnect();
			button.click();
		};
		const observer = new MutationObserver(tryReject);
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		tryReject();
		window.setTimeout(() => {
			done = true;
			observer.disconnect();
		}, GIVE_UP_MS);
	}
	var guarded = window;
	if (!guarded.__toolboxCookieReject) {
		guarded.__toolboxCookieReject = true;
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
		else start();
	}
	//#endregion
})();
