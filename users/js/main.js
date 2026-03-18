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

                // Закрытие по клику на крестик, кнопку отмены или фон
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

            // Сброс старых обработчиков
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
            // e.preventDefault();
            // Modal.alert("Успешно", "Вход выполнен! (Демо)", () => {
            //     window.location.href = "dashboard.html";
            // });
        });

        registerForm.addEventListener("submit", e => {
            // e.preventDefault();
            // Modal.alert("Успешно", "Аккаунт создан! (Демо)", () => {
            //     window.location.href = "dashboard.html";
            // });
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
    const sessionList = document.getElementById("session-list");

    async function loadSessions() {
        if (!sessionList) return;
        try {
            const res = await fetch('/api/projects/');
            const projects = await res.json();
            sessionList.innerHTML = '';
            projects.forEach(p => {
                const item = document.createElement('div');
                item.className = 'session-item';
                const isOwner = p.owner_name === document.querySelector('.user-name')?.textContent;
                
                item.innerHTML = `
                    <div>
                        <strong>${p.name}</strong>
                        <div style="font-size: 0.8rem; color: #888">ID: ${p.id} ${isOwner ? '(Владелец)' : ''}</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="secondary" onclick="window.location.href='/editor/${p.id}/'">Открыть</button>
                        ${isOwner ? `<button class="secondary delete-session-btn" data-id="${p.id}" style="background:rgba(244,67,54,0.1); color:#f44336; border:1px solid rgba(244,67,54,0.2)">Удалить</button>` : ''}
                    </div>
                `;
                sessionList.appendChild(item);
            });

            // Навешиваем обработчики на кнопки удаления
            document.querySelectorAll('.delete-session-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.target.dataset.id;
                    Modal.confirm("Удаление сессии", "Вы уверены, что хотите удалить эту сессию? Все файлы будут стерты.", async () => {
                        try {
                            const res = await fetch(`/api/projects/${id}/`, {
                                method: 'DELETE',
                                headers: {
                                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ""
                                }
                            });
                            if (res.ok) {
                                loadSessions();
                            } else {
                                const data = await res.json();
                                Modal.alert("Ошибка", data.error || "Не удалось удалить сессию");
                            }
                        } catch (err) {
                            Modal.alert("Ошибка", "Ошибка сети при удалении");
                        }
                    });
                };
            });
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }

    if (sessionList) loadSessions();

    if (createSessionBtn) {
        createSessionBtn.addEventListener("click", () => {
            Modal.show("Новая сессия", `
                <div class="form-group">
                    <label>Название проекта</label>
                    <input type="text" id="project-name" value="Новый проект">
                </div>
                <div class="form-group">
                    <label>Пароль сессии (необязательно)</label>
                    <input type="password" id="project-password" placeholder="Пусто для публичного доступа">
                </div>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="project-public" style="width:auto; margin:0"> Публичная сессия
                    </label>
                </div>
            `, "confirm", async () => {
                const name = document.getElementById("project-name").value;
                const password = document.getElementById("project-password").value;
                const is_public = document.getElementById("project-public").checked;
                
                if (name) {
                    try {
                        const res = await fetch('/api/projects/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ""
                            },
                            body: JSON.stringify({ name, password, is_public })
                        });
                        const project = await res.json();
                        window.location.href = `/editor/${project.id}/`;
                    } catch (e) {
                        Modal.alert("Ошибка", "Не удалось создать сессию");
                    }
                }
            });
        });
    }

    if (joinSessionBtn) {
        joinSessionBtn.addEventListener("click", async () => {
            const sessionId = document.getElementById("session-id-input").value;
            if (sessionId) {
                Modal.show("Подключение к сессии", `
                    <p>ID сессии: <strong>${sessionId}</strong></p>
                    <div class="form-group" style="margin-top:15px;">
                        <label>Пароль доступа</label>
                        <input type="password" id="join-password" placeholder="Введите пароль если требуется">
                    </div>
                `, "confirm", async () => {
                    const password = document.getElementById("join-password").value;
                    try {
                        const res = await fetch('/api/projects/join/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ""
                            },
                            body: JSON.stringify({ project_id: sessionId, password })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            window.location.href = `/editor/${data.project_id}/`;
                        } else {
                            Modal.alert("Ошибка", data.error || "Сессия не найдена");
                        }
                    } catch (e) {
                        Modal.alert("Ошибка", "Произошла ошибка при подключении");
                    }
                });
            } else {
                Modal.alert("Ошибка", "Пожалуйста, введите ID сессии");
            }
        });
    }

    // === ЛОГИКА РЕДАКТОРА (editor.html) ===
    const fileUpload = document.getElementById("file-upload");
    const downloadBtn = document.getElementById("download-btn");
    const fileItems = document.querySelectorAll(".file-item");
    const editorElement = document.querySelector(".editor-content");

    // Инициализация CodeJar + Prism
    let jarInstance = null; // Store instance globally in this scope

    if (editorElement && window.CodeJar) {
        jarInstance = CodeJar(
            editorElement,
            editor => {
                // Подсветка синтаксиса Python
                editor.innerHTML = Prism.highlight(editor.textContent, Prism.languages.python, "python");
            },
            {
                tab: "    ", // 4 пробела для Python
                indentOn: /[\[\{\(\:]$/, // Авто-отступ после двоеточия и скобок
            },
        );

        // Восстановление кода из sessionStorage
        const savedCode = sessionStorage.getItem('current_code');
        if (savedCode) {
            jarInstance.updateCode(savedCode);
        } else if (!editorElement.textContent.trim()) {
            jarInstance.updateCode('# Пример Python кода\ndef hello():\n    print("Hello, World!")\n\nhello()');
        }

        // Сохранение кода при изменениях
        editorElement.addEventListener('input', () => {
            sessionStorage.setItem('current_code', jarInstance.toString());
        });
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

    // Переключение файлов
    fileItems.forEach(item => {
        item.addEventListener("click", () => {
            fileItems.forEach(f => f.classList.remove("active"));
            item.classList.add("active");

            const fileName = item.textContent.replace("📄 ", "").trim();
            document.querySelector(".editor-header span").textContent = fileName;

            // Имитация смены контента
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
                // Триггерим подсветку вручную если CodeJar не загрузился
                if (window.Prism) {
                    editorElement.innerHTML = Prism.highlight(
                        editorElement.textContent,
                        Prism.languages.python,
                        "python",
                    );
                }
            }

            // На мобильных скрываем меню
            if (window.innerWidth <= 768) {
                document.getElementById("sidebar").classList.remove("open");
            }
        });
    });

    // === МОБИЛЬНОЕ МЕНЮ ===
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
