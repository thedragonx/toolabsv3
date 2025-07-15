(function () {
	function sendTokens() {
		const accessToken = localStorage.getItem("accessToken");
		const refreshToken = localStorage.getItem("refreshToken");

		if (accessToken && refreshToken) {
			chrome.runtime.sendMessage({
				action: "storeTokens",
				data: { accessToken, refreshToken },
			});
		}
	}

	sendTokens();

	window.addEventListener("storage", function (e) {
		if (e.key === "accessToken" || e.key === "refreshToken") {
			sendTokens();
		}
	});
})();
