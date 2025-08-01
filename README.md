﻿# Changelog: Toolabs Extension (Unofficial Redesign)

This project is an unofficial, conceptual redesign of the Toolabs Chrome extension. It was undertaken as a passion project to explore modern UI/UX patterns and enhance the overall user experience.

---

### Visual Comparison: Before & After

<table align="center">
  <tr>
    <td align="center"><strong>Before (V2)</strong></td>
    <td align="center"><strong>After (V3.0 - Final)</strong></td>
  </tr>
  <tr>
    <td align="center">
      <p><em>Basic functional design.</em></p>
      <img src="img/v2.png" alt="Version 2 UI" width="300">
    </td>
    <td align="center">
      <p><em>Modern "Liquid Glass" design with grouped tool servers.</em></p>
      <img src="img/v3dark.png" alt="Version 3.0 UI" width="300">
    </td>
  </tr>
</table>

---

## Version 3.0: The Complete Overhaul

This version represents a fundamental transformation from the original V2, rebuilding the extension to be more intuitive, powerful, and enjoyable to use.

### ✨ Visual & UI Overhaul

The entire user interface has been re-engineered from the ground up with a premium, modern aesthetic.

- **"Liquid Glass" Design System**: We replaced the original flat design with a stunning "Liquid Glass" look. This includes a rich, fluid **Mesh Gradient** background and detailed glass-like cards with realistic edge glare.
- **Dynamic Island Header**: The static V2 header has been upgraded to an interactive "Dynamic Island" that elegantly houses the new theme switcher.
- **Light & Dark Modes**: Full support for both themes has been implemented, allowing users to choose their preferred look.

    <table align="center">
      <tr>
        <td align="center"><strong>Dark Mode</strong></td>
        <td align="center"><strong>Light Mode</strong></td>
      </tr>
      <tr>
        <td align="center">
          <img src="img/v3dark.png" alt="Dark Mode UI" width="300">
        </td>
        <td align="center">
          <img src="img/v3light.png" alt="Light Mode UI" width="300">
        </td>
      </tr>
    </table>

- **Elegant Category Navigation**: The standard scrollbar has been replaced with a subtle **fade-out effect**, indicating scrollability without adding clutter and promoting a natural swipe/drag interaction.
- **Spacious & Breathable Layout**: We increased the padding and grid gap to give all UI elements more space, resulting in a cleaner, more focused interface.

### 🚀 Core Features & Smart Functionality

Core functionalities were re-engineered to be smarter and more efficient.

- **Grouped Tool Servers**: Fundamentally changed how tools are displayed. Instead of a cluttered grid showing every single server (V2), tools are now **neatly grouped under a single icon**. Clicking a tool opens a beautiful modal to select a server.
- **Pin Favorite Tools**: A completely new feature allowing users to pin their most-used tools via **right-click** (on desktop) or **long-press** (on touch devices). Pinned tools are automatically sorted to the top for instant access.
- **Robust Authentication**: The login system now supports **automatic token refreshing**, reducing login friction and session interruptions for the user.

### 🛠️ User Experience & Performance Enhancements

Dozens of small details were added to make the experience feel seamless and professional.

- **Smart-Click Interaction**: Tools with only one active server are now opened **directly with a single click**, intelligently bypassing the unnecessary server selection modal.
- **Interactive Feedback**:
  - **Toast Notifications**: Non-intrusive "toast" notifications now confirm actions like pinning or unpinning a tool.
  - **Onboarding**: A one-time tooltip now guides new users, ensuring the discoverability of the pinning feature.
- **Professional Loading States**:
  - **Skeleton Loaders**: Blank screens during data fetching have been eliminated and replaced with animated skeleton placeholders.
  - **Empty States**: Informative messages are now shown for searches or categories with no results.
- **Bug Fixes**: Squashed critical bugs from the development process, including a `TypeError` that prevented tools from loading and a CSS rendering issue that caused a "patchy" background. The result is a significantly more stable and polished experience.
