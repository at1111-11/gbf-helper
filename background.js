// Opens the helper in the browser's right-side panel when the toolbar icon is clicked.
// The extension has no host permissions and makes no network requests.
function usePanelOnClick() {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
}

usePanelOnClick();
chrome.runtime.onInstalled.addListener(usePanelOnClick);
chrome.runtime.onStartup.addListener(usePanelOnClick);

// Fallback for browsers without the side panel API: open the panel as a narrow window on the right.
if (!chrome.sidePanel) {
  chrome.action.onClicked.addListener(async () => {
    const current = await chrome.windows.getCurrent();
    const width = 400;
    chrome.windows.create({
      url: 'panel.html',
      type: 'popup',
      width,
      height: current.height || 800,
      left: (current.left || 0) + Math.max(0, (current.width || width) - width),
      top: current.top || 0
    });
  });
}
