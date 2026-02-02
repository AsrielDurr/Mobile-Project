const CONTAINER_ID = "auto-dialog-container";

function ensureContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: "9999",
    });
    document.body.appendChild(container);
  }
  return container;
}

function renderDialog(message) {
  const container = ensureContainer();

  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    minWidth: "280px",
    maxWidth: "360px",
    padding: "20px",
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
    border: "1px solid #e5eaf2",
    fontSize: "14px",
    color: "#1f2937",
    lineHeight: "1.5",
    pointerEvents: "auto",
  });

  dialog.textContent = message;

  container.appendChild(dialog);
  return dialog;
}

function closeDialog(dialog) {
  if (dialog && dialog.parentNode) {
    dialog.parentNode.removeChild(dialog);
  }
}

export function autoAlert(message, delayMs = 1000) {
  return new Promise((resolve) => {
    const dialog = renderDialog(message);
    setTimeout(() => {
      closeDialog(dialog);
      resolve();
    }, delayMs);
  });
}

// export function autoConfirm(message, delayMs = 1000) {
//   return new Promise((resolve) => {
//     const dialog = renderDialog(message);
//     setTimeout(() => {
//       closeDialog(dialog);
//       resolve(true);
//     }, delayMs);
//   });
// }
export function autoConfirm(message) {
  return new Promise((resolve) => {
    const container = ensureContainer();

    const dialog = document.createElement("div");
    Object.assign(dialog.style, {
      minWidth: "300px",
      padding: "20px",
      background: "#fff",
      borderRadius: "14px",
      boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
      border: "1px solid #e5eaf2",
      pointerEvents: "auto",
    });

    const text = document.createElement("div");
    text.textContent = message;
    text.style.marginBottom = "16px";

    const actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.className = "btn btn-ghost";

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "确认";
    confirmBtn.className = "btn btn-danger";

    cancelBtn.onclick = () => {
      closeDialog(dialog);
      resolve(false);
    };

    confirmBtn.onclick = () => {
      closeDialog(dialog);
      resolve(true);
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(text);
    dialog.appendChild(actions);

    container.appendChild(dialog);
  });
}

