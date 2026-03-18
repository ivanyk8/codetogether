document.addEventListener("DOMContentLoaded", () => {
    // === СИСТЕМА МОДАЛЬНЫХ ОКОН ===
    const Modal = {
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
                    if (e.target === modal) Modal.close();
                });

                document.querySelectorAll(".close-modal, .close-modal-btn").forEach(btn => {
                    btn.addEventListener("click", () => Modal.close());
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
                Modal.close();
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
            const inputHtml = `<p>${message}</p><input type="text" id="modal-prompt-input" value="${defaultValue}" style="margin-top:10px;">`;
            this.show(title, inputHtml, "prompt", callback);
        },
    };

    // === ЛОГИКА АВТОРИЗАЦИИ (index.html) ===
    const loginCard = document.getElementById("login-card");
    const registerCard = document.getElementById("register-card");
    const recoveryCard = document.getElementById("recovery-card");

    const showRegisterBtn = document.getElementById("show-register");
    const showLoginBtn = document.getElementById("show-login");
    const showRecoveryBtn = document.getElementById("show-recovery");
    const backToLoginBtn = document.getElementById("back-to-login");

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const recoveryForm = document.getElementById("recovery-form");

    if (loginCard && registerCard) {
        showRegisterBtn.addEventListener("click", () => {
            loginCard.style.display = "none";
            registerCard.style.display = "block";
            if (recoveryCard) recoveryCard.style.display = "none";
        });

        showLoginBtn.addEventListener("click", () => {
            registerCard.style.display = "none";
            loginCard.style.display = "block";
            if (recoveryCard) recoveryCard.style.display = "none";
        });

        if (showRecoveryBtn && recoveryCard) {
            showRecoveryBtn.addEventListener("click", () => {
                loginCard.style.display = "none";
                recoveryCard.style.display = "block";
            });
        }

        if (backToLoginBtn && recoveryCard) {
            backToLoginBtn.addEventListener("click", () => {
                recoveryCard.style.display = "none";
                loginCard.style.display = "block";
            });
        }

        loginForm.addEventListener("submit", e => {
            e.preventDefault();
            Modal.alert("Успешно", "Вход выполнен! (Демо)", () => {
                window.location.href = "dashboard.html";
            });
        });

        registerForm.addEventListener("submit", e => {
            e.preventDefault();
            Modal.alert("Успешно", "Аккаунт создан! (Демо)", () => {
                window.location.href = "dashboard.html";
            });
        });

        if (recoveryForm) {
            recoveryForm.addEventListener("submit", e => {
                e.preventDefault();
                Modal.alert("Восстановление", "Инструкция по сбросу пароля отправлена на Email! (Демо)", () => {
                    recoveryCard.style.display = "none";
                    loginCard.style.display = "block";
                });
            });
        }
    }

    // === ЛОГИКА ДАШБОРДА (dashboard.html) ===
    const logoutBtn = document.getElementById("logout-btn");
    const createSessionBtn = document.getElementById("create-session-btn");
    const joinSessionBtn = document.getElementById("join-session-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            Modal.confirm("Выход", "Вы уверены, что хотите выйти?", () => {
                window.location.href = "index.html";
            });
        });
    }

    if (createSessionBtn) {
        createSessionBtn.addEventListener("click", () => {
            Modal.prompt("Новая сессия", "Введите название проекта:", "Новый проект", name => {
                if (name) {
                    Modal.alert("Готово", `Сессия "${name}" создана!`, () => {
                        window.location.href = "editor.html";
                    });
                }
            });
        });
    }

    if (joinSessionBtn) {
        joinSessionBtn.addEventListener("click", () => {
            const sessionId = document.getElementById("session-id-input").value;
            if (sessionId) {
                Modal.alert("Подключение", `Подключение к сессии ${sessionId}...`, () => {
                    window.location.href = "editor.html";
                });
            } else {
                Modal.alert("Ошибка", "Пожалуйста, введите ID сессии");
            }
        });
    }

    // === ЛОГИКА ИГРУШЕЧНОГО ИЗМЕНЕНИЯ ПАРОЛЯ ===
    const changePasswordBtn = document.getElementById("change-password-btn");
    let demoPassword = "12345"; // виртуальный текущий пароль

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", () => {
            Modal.prompt("Изменение пароля", "Введите новый пароль:", "", newPassword => {
                if (newPassword) {
                    demoPassword = newPassword; // просто сохраняем в переменную
                    Modal.alert("Успешно", "Пароль изменён (игрушечная версия)!");
                    console.log("Новый пароль (демо):", demoPassword);
                }
            });
        });
    }

    // === ЛОГИКА РЕДАКТОРА (editor.html) ===
    const fileUpload = document.getElementById("file-upload");
    const downloadBtn = document.getElementById("download-btn");
    const fileItems = document.querySelectorAll(".file-item");
    const editorElement = document.querySelector(".editor-content");

    let jarInstance = null;

    if (editorElement && window.CodeJar) {
        jarInstance = CodeJar(
            editorElement,
            editor => {
                editor.innerHTML = Prism.highlight(editor.textContent, Prism.languages.python, "python");
            },
            {
                tab: "    ",
            },
        );

        if (!editorElement.textContent.trim()) {
            jarInstance.updateCode('# Пример Python кода\ndef hello():\n    print("Hello, World!")\n\nhello()');
        }
    }

    if (fileUpload) {
        fileUpload.addEventListener("change", e => {
            const file = e.target.files[0];
            if (file) {
                Modal.alert("Загрузка", `Файл "${file.name}" загружен! (Демо)`);
            }
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            Modal.alert("Скачивание", "Скачивание файлов проекта... (Демо)");
        });
    }

    fileItems.forEach(item => {
        item.addEventListener("click", () => {
            fileItems.forEach(f => f.classList.remove("active"));
            item.classList.add("active");

            const fileName = item.textContent.replace("📄 ", "").trim();
            document.querySelector(".editor-header span").textContent = fileName;

            let newCode = "";
            if (fileName.endsWith(".py")) {
                newCode = `# Код файла ${fileName}\nprint("This is ${fileName}")`;
            } else if (fileName.endsWith(".md")) {
                newCode = `# ${fileName}\n\nОписание проекта...`;
            }

            if (jarInstance) {
                jarInstance.updateCode(newCode);
            } else if (editorElement) {
                editorElement.textContent = newCode;
                if (window.Prism) {
                    editorElement.innerHTML = Prism.highlight(
                        editorElement.textContent,
                        Prism.languages.python,
                        "python",
                    );
                }
            }

            if (window.innerWidth <= 768) {
                document.getElementById("sidebar").classList.remove("open");
            }
        });
    });

    const menuToggle = document.getElementById("menu-toggle");
    const closeSidebarBtn = document.getElementById("close-sidebar");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    if (closeSidebarBtn && sidebar) {
        closeSidebarBtn.addEventListener("click", () => {
            sidebar.classList.remove("open");
        });
    }
});
