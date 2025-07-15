class ToolabsExtension {
	constructor() {
		this.manifest = chrome.runtime.getManifest();
		this.homepageUrl = this.manifest.homepage_url;
		this.loginUrl = `${this.homepageUrl}/login`;
		this.accessToken = null;
		this.refreshToken = null;
		this.headers = new Headers();
		this.pinnedTools = new Set();
		this.activeCategoryId = null;
		this.toastTimeout = null;

		this.elements = {
			loginPrompt: document.getElementById("login-prompt"),
			mainContent: document.getElementById("main-content"),
			searchInput: document.getElementById("search-input"),
			toolsGrid: document.getElementById("tools-grid"),
			categoriesContainer: document.getElementById("categories-container"),
			serverModal: document.getElementById("server-modal"),
			modalCloseBtn: document.getElementById("modal-close-btn"),
			modalToolName: document.getElementById("modal-tool-name"),
			serverList: document.getElementById("server-list"),
			contextMenu: document.getElementById("custom-context-menu"),
			toastNotification: document.getElementById("toast-notification"),
			onboardingTooltip: document.getElementById("onboarding-tooltip"),
			tooltipCloseBtn: document.getElementById("tooltip-close-btn"),
		};
	}

	init() {
		console.log("Initializing final version (fixed)...");
		this.checkAuthentication();
		this.setupEventListeners();
	}

	setupEventListeners() {
		this.elements.modalCloseBtn.addEventListener("click", () => this.closeServerModal());
		this.elements.serverModal.addEventListener("click", (e) => {
			if (e.target === this.elements.serverModal) this.closeServerModal();
		});
		this.elements.searchInput.addEventListener("input", (e) => {
			this.searchAPI(e.target.value.trim());
		});
		window.addEventListener("click", () => this.hideContextMenu());
		this.elements.tooltipCloseBtn.addEventListener("click", () => this.dismissOnboarding());
	}

	// --- FUNGSI OTENTIKASI ---
	checkAuthentication() {
		chrome.storage.local.get(["accessToken", "refreshToken", "tokenTimestamp"], (result) => {
			const tokenAge = Date.now() - (result.tokenTimestamp || 0);
			const isTokenFresh = tokenAge < 86400000;

			if (result.accessToken && result.refreshToken && isTokenFresh) {
				this.accessToken = result.accessToken;
				this.refreshToken = result.refreshToken;
				this.updateAuthHeader();
				this.validateToken();
			} else {
				this.checkTabsForToolabsDomain();
			}
		});
	}
	checkTabsForToolabsDomain() {
		chrome.tabs.query({}, (tabs) => {
			const toolabsTab = tabs.find((tab) => {
				try {
					return new URL(tab.url).hostname === new URL(this.homepageUrl).hostname;
				} catch (e) {
					return false;
				}
			});
			if (toolabsTab) {
				if (this.isLoginPage(toolabsTab.url)) {
					this.redirectToLoginForce();
					return;
				}
				chrome.scripting.executeScript(
					{
						target: { tabId: toolabsTab.id },
						func: () => ({
							accessToken: localStorage.getItem("accessToken"),
							refreshToken: localStorage.getItem("refreshToken"),
						}),
					},
					(results) => {
						const tokens = results[0]?.result;
						if (tokens?.accessToken && tokens?.refreshToken) {
							chrome.storage.local.set({
								accessToken: tokens.accessToken,
								refreshToken: tokens.refreshToken,
								tokenTimestamp: Date.now(),
							});
							this.accessToken = tokens.accessToken;
							this.refreshToken = tokens.refreshToken;
							this.updateAuthHeader();
							this.validateToken();
						} else {
							this.redirectToLogin();
						}
					}
				);
			} else {
				this.redirectToLogin();
			}
		});
	}
	validateToken() {
		fetch(`${this.homepageUrl}/api/member/auth/validate`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({ token: this.accessToken }),
		})
			.then((response) => {
				if (!response.ok) {
					return this.refreshTokenFunc().then((refreshSuccess) => {
						if (refreshSuccess) return this.validateToken();
						this.redirectToLogin();
						return null;
					});
				}
				return response.json();
			})
			.then((data) => {
				if (!data) return;
				this.showMainContent();
				this.startFeatures();
			})
			.catch((error) => {
				console.error("Error validating token:", error);
				this.redirectToLogin();
			});
	}
	refreshTokenFunc() {
		return fetch(`${this.homepageUrl}/api/member/auth/refresh-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: this.refreshToken }),
		})
			.then((response) => {
				if (!response.ok) return false;
				return response.json();
			})
			.then((data) => {
				if (!data) return false;
				this.accessToken = data.accessToken;
				this.updateAuthHeader();
				chrome.storage.local.set({
					accessToken: data.accessToken,
					tokenTimestamp: Date.now(),
				});
				return true;
			})
			.catch((error) => {
				console.error("Error refreshing token:", error);
				return false;
			});
	}
	showMainContent() {
		this.elements.loginPrompt.classList.add("hidden");
		this.elements.mainContent.classList.remove("hidden");
	}
	redirectToLogin() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0 && !this.isLoginOrDashboardPage(tabs[0].url)) {
				chrome.tabs.create({ url: this.loginUrl });
				window.close();
			} else {
				this.redirectToLoginForce();
			}
		});
	}
	redirectToLoginForce() {
		this.elements.mainContent.classList.add("hidden");
		this.elements.loginPrompt.classList.remove("hidden");
		document.getElementById("refresh-login-button").addEventListener("click", () => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.update(tabs[0].id, { url: this.loginUrl });
				} else {
					chrome.tabs.create({ url: this.loginUrl });
				}
				window.close();
			});
		});
	}

	// --- FUNGSI FITUR UTAMA ---
	async startFeatures() {
		await this.loadPinnedTools();
		this.getCategories();
		this.getTools();
		this.checkOnboarding();
	}

	// --- FUNGSI YANG HILANG SEBELUMNYA ---
	getCategories() {
		fetch(`${this.homepageUrl}/api/member/tools/categories`, {
			method: "GET",
			headers: this.headers,
		})
			.then((response) => response.json())
			.then((categories) => {
				const container = this.elements.categoriesContainer;
				container.innerHTML = "";

				const allBtn = document.createElement("button");
				allBtn.className = "category-btn active";
				allBtn.textContent = "All";
				allBtn.addEventListener("click", () => {
					document.querySelectorAll(".category-btn").forEach((btn) => btn.classList.remove("active"));
					allBtn.classList.add("active");
					this.getTools();
				});
				container.appendChild(allBtn);

				categories.forEach((category) => {
					const btn = document.createElement("button");
					btn.className = "category-btn";
					btn.textContent = category.name;
					btn.dataset.categoryId = category.id;
					btn.addEventListener("click", () => {
						document.querySelectorAll(".category-btn").forEach((btn) => btn.classList.remove("active"));
						btn.classList.add("active");
						this.getTools(category.id);
					});
					container.appendChild(btn);
				});
			})
			.catch((error) => console.error("Error getting categories:", error));
	}

	// --- FUNGSI GET & RENDER (DENGAN SKELETON & EMPTY STATE) ---
	getTools(categoryId = null) {
		this.activeCategoryId = categoryId;
		this.showSkeletonLoader();

		const url = categoryId ? `${this.homepageUrl}/api/member/tools/categories?id=${categoryId}` : `${this.homepageUrl}/api/member/tools`;
		fetch(url, { method: "GET", headers: this.headers })
			.then((response) => response.json())
			.then((tools) => {
				this.renderTools(tools || []);
			})
			.catch((error) => {
				console.error("Error getting tools:", error);
				this.renderTools([]);
			});
	}

	searchAPI(keyword) {
		this.activeCategoryId = null;
		this.showSkeletonLoader();

		const url = keyword ? `${this.homepageUrl}/api/member/tools?name=${encodeURIComponent(keyword)}` : `${this.homepageUrl}/api/member/tools`;
		fetch(url, { method: "GET", headers: this.headers })
			.then((response) => response.json())
			.then((tools) => {
				this.renderTools(tools || []);
			})
			.catch((error) => {
				console.error("Error searching tools:", error);
				this.renderTools([]);
			});
	}

	renderTools(toolsData) {
		const toolsGrid = this.elements.toolsGrid;
		toolsGrid.innerHTML = "";

		const categories = Array.isArray(toolsData) ? toolsData : [toolsData];
		const allLogos = [];
		categories.forEach((category) => allLogos.push(...(category.logos || [])));
		const uniqueLogos = Array.from(new Map(allLogos.map((logo) => [logo.groupName, logo])).values());

		if (uniqueLogos.length === 0) {
			toolsGrid.innerHTML = `<p class="col-span-full text-center py-10" style="color: var(--text-secondary);">Oops, tool tidak ditemukan.</p>`;
			return;
		}

		uniqueLogos.sort((a, b) => {
			const aIsPinned = this.pinnedTools.has(a.groupName);
			const bIsPinned = this.pinnedTools.has(b.groupName);
			if (aIsPinned && !bIsPinned) return -1;
			if (!aIsPinned && bIsPinned) return 1;
			return 0;
		});

		uniqueLogos.forEach((logo) => {
			const groupID = logo.groupName;
			const isPinned = this.pinnedTools.has(groupID);
			const card = this.createToolCard(logo, groupID, isPinned);
			toolsGrid.appendChild(card);
		});
	}

	createToolCard(logo, groupID, isPinned) {
		const card = document.createElement("div");
		card.className = "app-card group flex flex-col items-center text-center relative";
		const isGroupInMaintenance = logo.tools.every((tool) => tool.isMaintenance);
		if (isGroupInMaintenance) {
			card.classList.add("maintenance");
		}
		const pinnedIconHTML = `<div class="pinned-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M32 32C32 14.3 46.3 0 64 0H320c17.7 0 32 14.3 32 32s-14.3 32-32 32H293.5L216 179.3l59.9 83.8c3.1 4.3 3.2 10.2 .2 14.6s-8.3 7.3-13.8 7.3H121.6c-5.5 0-10.7-2.9-13.8-7.3s-2.9-10.3 .2-14.6L168 179.3 90.5 64H64C46.3 64 32 49.7 32 32zM160 384h64v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V384z"/></svg></div>`;
		card.innerHTML = `
            ${isPinned ? pinnedIconHTML : ""}
			<div class="app-icon-container w-16 h-16 mb-3 flex items-center justify-center rounded-2xl shadow-lg bg-white/10 transition-transform duration-300">
				<img src="${logo.logo}" alt="${logo.groupName}" class="w-10 h-10 object-contain rounded-lg">
			</div>
			<span class="text-sm font-medium" style="color: var(--text-secondary);">${logo.groupName}</span>
			${isGroupInMaintenance ? '<div class="maintenance-badge">MAINTENANCE</div>' : ""}
		`;

		card.addEventListener("click", () => {
			if (isGroupInMaintenance) return;
			const activeServers = logo.tools.filter((t) => !t.isMaintenance);
			if (activeServers.length === 1) {
				this.showToast(`Membuka ${logo.groupName}...`);
				this.fetchAndDisplayToolDetail(activeServers[0].id);
			} else {
				this.showServerSelectionModal(logo);
			}
		});

		card.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			this.hideContextMenu();
			this.showContextMenu(e.pageX, e.pageY, logo, isPinned);
		});
		let pressTimer = null;
		const startPress = () => {
			pressTimer = setTimeout(() => {
				this.togglePin(logo);
				if (window.navigator.vibrate) window.navigator.vibrate(50);
			}, 700);
		};
		const cancelPress = () => {
			clearTimeout(pressTimer);
		};
		card.addEventListener("mousedown", startPress);
		card.addEventListener("mouseup", cancelPress);
		card.addEventListener("mouseleave", cancelPress);
		card.addEventListener("touchstart", startPress, { passive: true });
		card.addEventListener("touchend", cancelPress);
		card.addEventListener("touchcancel", cancelPress);
		return card;
	}

	// --- FUNGSI UNTUK FITUR UX ---
	showSkeletonLoader(count = 16) {
		const toolsGrid = this.elements.toolsGrid;
		toolsGrid.innerHTML = "";
		for (let i = 0; i < count; i++) {
			const skeleton = document.createElement("div");
			skeleton.className = "skeleton-card";
			skeleton.innerHTML = `<div class="skeleton-icon"></div><div class="skeleton-text"></div>`;
			toolsGrid.appendChild(skeleton);
		}
	}

	showToast(message) {
		clearTimeout(this.toastTimeout);
		const toast = this.elements.toastNotification;
		toast.textContent = message;
		toast.classList.add("show");
		this.toastTimeout = setTimeout(() => {
			toast.classList.remove("show");
		}, 3000);
	}

	async checkOnboarding() {
		const { hasSeenPinTooltip } = await chrome.storage.local.get("hasSeenPinTooltip");
		if (!hasSeenPinTooltip) {
			setTimeout(() => this.showOnboardingTooltip(), 1000);
		}
	}

	showOnboardingTooltip() {
		const firstCard = this.elements.toolsGrid.querySelector(".app-card");
		if (!firstCard) return;

		const tooltip = this.elements.onboardingTooltip;
		const cardRect = firstCard.getBoundingClientRect();

		tooltip.style.top = `${cardRect.top + cardRect.height / 2 - tooltip.offsetHeight / 2}px`;
		tooltip.style.left = `${cardRect.right + 15}px`;
		tooltip.classList.remove("hidden");
	}

	async dismissOnboarding() {
		this.elements.onboardingTooltip.classList.add("hidden");
		await chrome.storage.local.set({ hasSeenPinTooltip: true });
	}

	// --- FUNGSI PIN (DENGAN TOAST NOTIFICATION) ---
	togglePin(logo) {
		const groupID = logo.groupName;
		if (this.pinnedTools.has(groupID)) {
			this.pinnedTools.delete(groupID);
			this.showToast(`${logo.groupName} dilepas`);
		} else {
			this.pinnedTools.add(groupID);
			this.showToast(`${logo.groupName} disematkan`);
		}
		this.savePinnedTools();
		this.getTools(this.activeCategoryId);
	}

	// --- FUNGSI LAINNYA ---
	showServerSelectionModal(logo) {
		this.elements.modalToolName.textContent = logo.groupName;
		this.elements.serverList.innerHTML = "";
		logo.tools.forEach((tool, index) => {
			const serverCard = document.createElement("button");
			serverCard.className = "server-card";
			const serverName = tool.serverName || `Server ${index + 1}`;
			const isMaintenance = tool.isMaintenance;
			serverCard.innerHTML = `
                <div class="server-icon-container">
                    <img src="${logo.logo}" alt="${logo.groupName}">
                </div>
                <span>${serverName}</span>
                ${isMaintenance ? '<div class="server-maintenance-badge">Maint.</div>' : ""}
            `;
			if (isMaintenance) {
				serverCard.disabled = true;
			} else {
				serverCard.addEventListener("click", () => {
					this.fetchAndDisplayToolDetail(tool.id);
					this.closeServerModal();
				});
			}
			this.elements.serverList.appendChild(serverCard);
		});
		this.elements.serverModal.classList.remove("hidden", "opacity-0");
	}

	closeServerModal() {
		this.elements.serverModal.classList.add("hidden", "opacity-0");
	}

	async loadPinnedTools() {
		const result = await chrome.storage.local.get(["pinnedTools"]);
		if (result.pinnedTools) {
			this.pinnedTools = new Set(result.pinnedTools);
		}
	}

	async savePinnedTools() {
		await chrome.storage.local.set({ pinnedTools: Array.from(this.pinnedTools) });
	}

	showContextMenu(x, y, logo, isPinned) {
		const menu = this.elements.contextMenu;
		const pinActionText = isPinned ? "Lepas Sematan" : "Sematkan Tool";
		const pinActionIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M32 32C32 14.3 46.3 0 64 0H320c17.7 0 32 14.3 32 32s-14.3 32-32 32H293.5L216 179.3l59.9 83.8c3.1 4.3 3.2 10.2 .2 14.6s-8.3 7.3-13.8 7.3H121.6c-5.5 0-10.7-2.9-13.8-7.3s-2.9-10.3 .2-14.6L168 179.3 90.5 64H64C46.3 64 32 49.7 32 32zM160 384h64v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V384z"/></svg>`;
		menu.innerHTML = `<ul class="glass-card rounded-lg py-1 shadow-xl"><li id="pin-action">${pinActionIcon} ${pinActionText}</li></ul>`;
		menu.style.top = `${y}px`;
		menu.style.left = `${x}px`;
		menu.classList.remove("hidden");
		document.getElementById("pin-action").addEventListener("click", (e) => {
			e.stopPropagation();
			this.togglePin(logo);
			this.hideContextMenu();
		});
	}

	hideContextMenu() {
		this.elements.contextMenu.classList.add("hidden");
	}

	fetchAndDisplayToolDetail(toolId) {
		fetch(`${this.homepageUrl}/api/member/tools/${toolId}`, { method: "GET", headers: this.headers })
			.then((response) => response.json())
			.then((tool) => {
				if (!tool) return;
				if (tool.url.includes("docs.google.com") || tool.url.includes("toolabs.live")) {
					chrome.tabs.create({ url: tool.url, active: true });
				} else {
					this.setCookies(tool.url, tool.key, () => {
						chrome.tabs.create({ url: tool.url, active: true });
					});
				}
			})
			.catch((error) => console.error("Error getting tool details:", error));
	}
	setCookies(url, cookies, callback) {
		let count = 0;
		if (!cookies || cookies.length === 0) {
			callback();
			return;
		}
		cookies.forEach((cookie) => {
			chrome.cookies.set(
				{
					url: url,
					name: cookie.name,
					value: cookie.value,
					domain: cookie.domain,
					path: "/",
					secure: cookie.name.startsWith("__Secure-") || cookie.name.startsWith("__Host-"),
					...(cookie.name.startsWith("__Host-") && { domain: undefined }),
				},
				() => {
					count++;
					if (count === cookies.length) callback();
				}
			);
		});
	}
	updateAuthHeader() {
		if (this.accessToken) {
			this.headers.set("Authorization", `Bearer ${this.accessToken}`);
		} else {
			this.headers.delete("Authorization");
		}
	}
	isLoginPage(url) {
		try {
			const path = new URL(url).pathname.toLowerCase();
			return path === "/login" || path === "/login/" || path.endsWith("/login");
		} catch (e) {
			return false;
		}
	}
	isDashboardPage(url) {
		try {
			const path = new URL(url).pathname.toLowerCase();
			return path.includes("/dashboard/");
		} catch (e) {
			return false;
		}
	}
	isLoginOrDashboardPage(url) {
		return this.isLoginPage(url) || this.isDashboardPage(url);
	}
}

// Inisialisasi utama
document.addEventListener("DOMContentLoaded", () => {
	const lightThemeBtn = document.getElementById("light-theme-btn");
	const darkThemeBtn = document.getElementById("dark-theme-btn");
	const applyTheme = (theme) => {
		document.body.classList.toggle("light-theme", theme === "light");
		lightThemeBtn.classList.toggle("theme-btn-active", theme === "light");
		darkThemeBtn.classList.toggle("theme-btn-active", theme === "dark");
		localStorage.setItem("theme", theme);
	};
	lightThemeBtn.addEventListener("click", () => applyTheme("light"));
	darkThemeBtn.addEventListener("click", () => applyTheme("dark"));
	applyTheme(localStorage.getItem("theme") || "dark");
	const blob1 = document.getElementById("blob1");
	const blob2 = document.getElementById("blob2");
	const blob3 = document.getElementById("blob3");
	function setInitialPosition(blob) {
		const x = Math.random() * (window.innerWidth - 400);
		const y = Math.random() * (window.innerHeight - 400);
		blob.style.transform = `translate(${x}px, ${y}px)`;
	}
	setInitialPosition(blob1);
	setInitialPosition(blob2);
	setInitialPosition(blob3);
	window.addEventListener("mousemove", (event) => {
		const { clientX, clientY } = event;
		blob1.style.transform = `translate(${clientX - 175}px, ${clientY - 175}px)`;
	});
	new ToolabsExtension().init();
});
