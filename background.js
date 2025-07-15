chrome.runtime.onInstalled.addListener(() => {
	const redirectUrl = `${chrome.runtime.getManifest().homepage_url}/dashboard?status=extension-installed`;
	chrome.tabs.create({ url: redirectUrl });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "storeTokens" && message.data) {
		chrome.storage.local.set({
			accessToken: message.data.accessToken,
			refreshToken: message.data.refreshToken,
			tokenTimestamp: Date.now(),
		});
	}
});
