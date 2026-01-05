/* =========================
   toast.js — Toast Notification System
   - Beautiful, non-blocking notifications
   - Success, error, warning, info types
   - Auto-dismiss with custom durations
   ========================= */

(function (global) {
  const TOAST_CONTAINER_ID = "toastContainer";
  const DEFAULT_DURATION = 3000; // 3 seconds

  // Create toast container on first use
  function ensureContainer() {
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = TOAST_CONTAINER_ID;
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  // Create and show a toast
  function showToast(message, type = "info", duration = DEFAULT_DURATION) {
    const container = ensureContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Toast styling based on type
    const styles = {
      info: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        icon: "ℹ️"
      },
      success: {
        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
        icon: "✓"
      },
      error: {
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        icon: "✕"
      },
      warning: {
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        icon: "⚠"
      }
    };

    const style = styles[type] || styles.info;

    toast.style.cssText = `
      background: ${style.background};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
      max-width: 100%;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      pointer-events: auto;
      cursor: pointer;
    `;

    toast.innerHTML = `
      <div style="font-size: 20px; line-height: 1;">${style.icon}</div>
      <div style="flex: 1;">${escapeHTML(message)}</div>
      <div style="font-size: 18px; opacity: 0.7; line-height: 1;">×</div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(0)";
      });
    });

    // Auto-dismiss
    const timeoutId = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    // Click to dismiss
    toast.addEventListener("click", () => {
      clearTimeout(timeoutId);
      dismissToast(toast);
    });

    return toast;
  }

  // Dismiss a toast
  function dismissToast(toast) {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100px)";

    setTimeout(() => {
      toast.remove();

      // Remove container if empty
      const container = document.getElementById(TOAST_CONTAINER_ID);
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }

  // Escape HTML to prevent XSS
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Public API
  global.Toast = {
    success: (msg, duration) => showToast(msg, "success", duration),
    error: (msg, duration = 5000) => showToast(msg, "error", duration), // Errors shown longer
    warning: (msg, duration) => showToast(msg, "warning", duration),
    info: (msg, duration) => showToast(msg, "info", duration),
    show: showToast
  };
})(window);
