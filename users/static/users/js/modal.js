// === СИСТЕМА МОДАЛЬНЫХ ОКОН (Глобальный объект) ===
window.Modal = {
    init() {
        if (!document.querySelector(".modal-overlay")) {
            const modalHtml = `
            <div class="modal-overlay" id="custom-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="modal-title">Сообщение</span>
                        <button class="close-modal" style="background:none; border:none; color:white; font-size:1.5rem; padding:0; cursor:pointer;">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button class="secondary close-modal-btn">Отмена</button>
                        <button class="primary confirm-modal-btn">ОК</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML("beforeend", modalHtml);

            const modal = document.getElementById("custom-modal");
            modal.addEventListener("click", e => {
                if (e.target === modal) window.Modal.close();
            });

            document.querySelectorAll(".close-modal, .close-modal-btn").forEach(btn => {
                btn.addEventListener("click", () => window.Modal.close());
            });
        }
    },

    show(title, content, type = "alert", onConfirm = null) {
        this.init();
        const modal = document.getElementById("custom-modal");
        const titleEl = modal.querySelector(".modal-title");
        const bodyEl = modal.querySelector(".modal-body");
        const confirmBtn = modal.querySelector(".confirm-modal-btn");
        const cancelBtn = modal.querySelector(".close-modal-btn");

        titleEl.textContent = title;
        bodyEl.innerHTML = content;

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        cancelBtn.style.display = type === "alert" ? "none" : "block";

        newConfirmBtn.onclick = () => {
            if (type === "prompt") {
                const val = document.getElementById("modal-prompt-input").value;
                if (onConfirm) onConfirm(val);
            } else {
                if (onConfirm) onConfirm();
            }
            window.Modal.close();
        };

        modal.classList.add("active");

        if (type === "prompt") {
            setTimeout(() => {
                const input = document.getElementById("modal-prompt-input");
                if (input) input.focus();
            }, 100);
        }
    },

    close() {
        const modal = document.getElementById("custom-modal");
        if (modal) modal.classList.remove("active");
    },

    alert(title, message, callback) {
        this.show(title, `<p>${message}</p>`, "alert", callback);
    },

    confirm(title, message, callback) {
        this.show(title, `<p>${message}</p>`, "confirm", callback);
    },

    prompt(title, message, defaultValue = "", callback) {
        const inputHtml = `<p>${message}</p><input type="text" id="modal-prompt-input" value="${defaultValue}">`;
        this.show(title, inputHtml, "prompt", callback);
    },
};

// Инициализация при загрузке
window.Modal.init();
