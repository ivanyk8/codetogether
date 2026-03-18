document.addEventListener("DOMContentLoaded", () => {
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
                item.className = 'session-item card-enter';
                const isOwner = p.owner_name === document.querySelector('.user-name')?.textContent;
                
                item.innerHTML = `
                    <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 48px; height: 48px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent-color); font-size: 1.5rem;">
                                <i class="fa-solid fa-folder-closed"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">${p.name}</h3>
                                <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted); font-family: 'JetBrains Mono';"># ID: ${p.id}</span>
                                    ${isOwner ? '<span class="badge" style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">Владелец</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="session-footer">
                        <button class="btn primary" onclick="window.location.href='/editor/${p.id}/'">
                            <i class="fa-solid fa-terminal"></i> Открыть редактор
                        </button>
                        ${isOwner ? `
                        <button class="btn-delete" data-id="${p.id}" title="Удалить сессию" style="width: 52px; height: 52px; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); color: var(--danger-color); cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>` : ''}
                    </div>
                `;
                sessionList.appendChild(item);
            });

            // Навешиваем обработчики на кнопки удаления
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.onclick = (e) => {
                    const btnEl = e.currentTarget;
                    const id = btnEl.dataset.id;
                    Modal.confirm("Удаление сессии", "Вы уверены, что хотите удалить эту сессию? Все файлы будут стерты.", async () => {
                        try {
                            const res = await fetch(`/api/projects/${id}/`, {
                                method: 'DELETE',
                                headers: {
                                    'X-CSRFToken': getCookie('csrftoken')
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

    // --- Settings Logic (for settings.html) ---
    const themeCircles = document.querySelectorAll('.theme-circle');
    if (themeCircles.length > 0) {
        window.setTheme = function(theme) {
            const input = document.getElementById('theme-input');
            const form = document.getElementById('theme-form');
            if (input && form) {
                input.value = theme;
                form.submit();
            }
        };
    }

    if (sessionList) loadSessions();

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        if (!cookieValue && name === 'csrftoken') {
            const meta = document.querySelector('meta[name="csrf-token"]');
            const val = meta?.getAttribute('content');
            if (val && val !== 'NOTPROVIDED') return val;
        }
        return cookieValue;
    }

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
                                'X-CSRFToken': getCookie('csrftoken')
                            },
                            body: JSON.stringify({ name, password, is_public })
                        });
                        const project = await res.json();
                        // Если API возвращает объект, берем id из него
                        const projectId = project.id || project.project_id;
                        if (projectId) {
                            window.location.href = `/editor/${projectId}/`;
                        } else {
                            console.error("API response missing ID:", project);
                            Modal.alert("Ошибка", "Сервер не вернул ID новой сессии");
                        }
                    } catch (e) {
                        Modal.alert("Ошибка", "Не удалось создать сессию");
                    }
                }
            });
        });
    }

    if (joinSessionBtn) {
        joinSessionBtn.addEventListener("click", async () => {
            const projectName = document.getElementById("session-id-input").value;
            if (projectName) {
                Modal.show("Подключение к сессии", `
                    <p>Имя сессии: <strong>${projectName}</strong></p>
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
                                'X-CSRFToken': getCookie('csrftoken')
                            },
                            body: JSON.stringify({ project_name: projectName, password })
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
                Modal.alert("Ошибка", "Пожалуйста, введите имя сессии");
            }
        });
    }

    // === ЛОГИКА РЕДАКТОРА (editor.html) ===
    const editorContainer = document.getElementById("editor");
    const currentFileNameEl = document.getElementById("current-filename");
    const saveStatusEl = document.getElementById("save-status");
    const fmTree = document.getElementById("fm-tree");

    if (editorContainer && window.ace) {
        const projectId = window.currentProjectId;
        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/tomorrow_night");
        editor.session.setMode("ace/mode/python");
        editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showPrintMargin: false,
            tabSize: 4,
            useSoftTabs: true
        });

        let currentFileId = null;
        let saveTimeout = null;
        let fmData = { folders: [], files: [] };
        let expandedFolders = new Set();
        let searchQuery = "";
        let ws = null;
        let wsReady = false;
        let applyingRemote = false;
        const fileStates = new Map();
        let remoteCursors = new Map();
        let wsConnectPromise = null;
        let wsConnectResolve = null;
        let wsConnectReject = null;
        let wsConnectTimer = null;

        const presenceBar = document.getElementById("presence-bar");
        const participantsList = document.getElementById("participants-list");
        const clientId = (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID()
            : `c_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

        // UI Helpers
        function updateSaveStatus(text, show = true) {
            if (!saveStatusEl) return;
            saveStatusEl.textContent = text;
            saveStatusEl.style.opacity = show ? '1' : '0';
            if (text === 'Сохранено') {
                setTimeout(() => { 
                    if(saveStatusEl.textContent === 'Сохранено') saveStatusEl.style.opacity = '0'; 
                }, 2000);
            }
        }

        function getFileState(fileId) {
            if (!fileId) return null;
            const key = Number(fileId);
            if (!fileStates.has(key)) {
                fileStates.set(key, { rev: 0, opQueue: [], opInFlight: false });
            }
            return fileStates.get(key);
        }

        function resetFileState(fileId, rev) {
            const st = getFileState(fileId);
            if (!st) return;
            st.rev = Number(rev) || 0;
            st.opQueue = [];
            st.opInFlight = false;
        }

        function renderPresence(users) {
            if (!presenceBar && !participantsList) return;
            const currentUsers = (users || []).filter(u => u && u.username);
            if (presenceBar) presenceBar.innerHTML = "";
            const shown = currentUsers.slice(0, 6);
            if (presenceBar) shown.forEach(u => {
                const el = document.createElement("div");
                el.style.width = "28px";
                el.style.height = "28px";
                el.style.borderRadius = "10px";
                el.style.display = "flex";
                el.style.alignItems = "center";
                el.style.justifyContent = "center";
                el.style.background = "rgba(255,255,255,0.04)";
                el.style.border = "1px solid var(--border-color)";
                el.style.color = "var(--text-primary)";
                el.style.fontWeight = "800";
                el.style.fontSize = "0.85rem";
                el.title = u.username + (u.file_id ? ` (файл ${u.file_id})` : "");
                el.textContent = String(u.username).slice(0, 1).toUpperCase();
                presenceBar.appendChild(el);
            });
            if (presenceBar && currentUsers.length > shown.length) {
                const more = document.createElement("div");
                more.style.color = "var(--text-secondary)";
                more.style.fontSize = "0.85rem";
                more.style.fontWeight = "700";
                more.textContent = `+${currentUsers.length - shown.length}`;
                presenceBar.appendChild(more);
            }

            if (participantsList) {
                participantsList.innerHTML = "";
                currentUsers.forEach(u => {
                    const row = document.createElement("div");
                    row.style.display = "flex";
                    row.style.alignItems = "center";
                    row.style.gap = "10px";
                    row.style.padding = "10px 12px";
                    row.style.borderRadius = "16px";
                    row.style.border = "1px solid var(--border-color)";
                    row.style.background = "rgba(255,255,255,0.03)";

                    const avatar = document.createElement("div");
                    avatar.style.width = "34px";
                    avatar.style.height = "34px";
                    avatar.style.borderRadius = "14px";
                    avatar.style.display = "flex";
                    avatar.style.alignItems = "center";
                    avatar.style.justifyContent = "center";
                    avatar.style.background = "var(--accent-glow)";
                    avatar.style.color = "var(--accent-color)";
                    avatar.style.fontWeight = "900";
                    avatar.textContent = String(u.username).slice(0, 1).toUpperCase();

                    const meta = document.createElement("div");
                    meta.style.minWidth = "0";

                    const name = document.createElement("div");
                    name.style.fontWeight = "800";
                    name.textContent = u.username;

                    const info = document.createElement("div");
                    info.style.color = "var(--text-secondary)";
                    info.style.fontSize = "12px";
                    info.textContent = u.file_id ? `Файл: ${u.file_id}` : "В проекте";

                    meta.appendChild(name);
                    meta.appendChild(info);
                    row.appendChild(avatar);
                    row.appendChild(meta);

                    participantsList.appendChild(row);
                });
            }
        }

        function ensureWs() {
            if (wsReady && ws && ws.readyState === WebSocket.OPEN) return;

            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/editor/${projectId}/`;
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                wsReady = true;
                ws.send(JSON.stringify({ type: "hello", client_id: clientId }));
                if (wsConnectResolve) wsConnectResolve();
            };

            ws.onclose = () => {
                wsReady = false;
                for (const st of fileStates.values()) st.opInFlight = false;
                if (wsConnectReject) wsConnectReject(new Error("ws_closed"));
                setTimeout(() => ensureWs(), 1500);
            };

            ws.onerror = () => {
                wsReady = false;
                if (wsConnectReject) wsConnectReject(new Error("ws_error"));
            };

            ws.onmessage = (evt) => {
                let msg;
                try { msg = JSON.parse(evt.data); } catch { return; }

                if (msg.type === "presence") {
                    renderPresence(msg.users);
                    return;
                }
                
                if (msg.type === "error") {
                    if (msg.message === "no_edit_permission") {
                        editor.setReadOnly(true);
                        updateSaveStatus("Только чтение", true);
                        return;
                    }
                    updateSaveStatus("Ошибка синхронизации", true);
                    return;
                }

                if (msg.type === "file_state" && msg.file_id === currentFileId) {
                    resetFileState(msg.file_id, msg.rev || 0);
                    applyingRemote = true;
                    editor.setValue(msg.content || "", -1);
                    applyingRemote = false;
                    updateSaveStatus("", false);
                    editor.setReadOnly(false);
                    return;
                }

                if (msg.type === "resync" && msg.file_id === currentFileId) {
                    const cursor = editor.getCursorPosition();
                    const scroll = editor.session.getScrollTop();
                    resetFileState(msg.file_id, msg.rev || 0);
                    applyingRemote = true;
                    editor.setValue(msg.content || "", -1);
                    applyingRemote = false;
                    editor.moveCursorToPosition(cursor);
                    editor.session.setScrollTop(scroll);
                    updateSaveStatus("Синхронизировано", true);
                    return;
                }

                if (msg.type === "op") {
                    const fileId = Number(msg.file_id);
                    const st = getFileState(fileId);

                    if (msg.client_id === clientId) {
                        if (st) {
                            st.rev = Number(msg.rev) || st.rev;
                            if (st.opQueue.length) st.opQueue.shift();
                            st.opInFlight = false;
                            flushFileQueue(fileId);
                        }
                        if (fileId === currentFileId) updateSaveStatus("Сохранено", true);
                        return;
                    }

                    if (st) st.rev = Number(msg.rev) || st.rev;

                    if (fileId === currentFileId && msg.delta) {
                        applyingRemote = true;
                        try {
                            editor.session.getDocument().applyDelta(msg.delta, true);
                        } catch {
                            editor.setValue(editor.getValue(), -1);
                        }
                        applyingRemote = false;
                    }

                    if (fileId === currentFileId && msg.cursor && msg.client_id) {
                        remoteCursors.set(msg.client_id, { cursor: msg.cursor, username: msg.username || "Anonymous" });
                        renderRemoteCursors();
                    }
                    return;
                }

                if (msg.type === "cursor" && msg.file_id === currentFileId && msg.client_id && msg.client_id !== clientId) {
                    remoteCursors.set(msg.client_id, { cursor: msg.cursor, username: msg.username || "Anonymous" });
                    renderRemoteCursors();
                    return;
                }
            };
        }

        function connectWsWithTimeout(timeoutMs = 1200) {
            if (wsReady && ws && ws.readyState === WebSocket.OPEN) return Promise.resolve();
            if (wsConnectPromise) return wsConnectPromise;

            wsConnectPromise = new Promise((resolve, reject) => {
                wsConnectResolve = () => {
                    if (wsConnectTimer) clearTimeout(wsConnectTimer);
                    wsConnectTimer = null;
                    wsConnectResolve = null;
                    wsConnectReject = null;
                    wsConnectPromise = null;
                    resolve();
                };
                wsConnectReject = (err) => {
                    if (wsConnectTimer) clearTimeout(wsConnectTimer);
                    wsConnectTimer = null;
                    wsConnectResolve = null;
                    wsConnectReject = null;
                    wsConnectPromise = null;
                    reject(err);
                };

                wsConnectTimer = setTimeout(() => {
                    if (wsConnectReject) wsConnectReject(new Error("ws_timeout"));
                }, timeoutMs);
            });

            ensureWs();
            return wsConnectPromise;
        }

        function flushFileQueue(fileId) {
            if (!wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;
            if (!fileId) return;
            const st = getFileState(fileId);
            if (!st) return;
            if (st.opInFlight) return;
            if (!st.opQueue.length) return;

            st.opInFlight = true;
            ws.send(JSON.stringify({
                type: "op",
                file_id: Number(fileId),
                base_rev: st.rev,
                delta: st.opQueue[0],
                cursor: Number(fileId) === currentFileId ? editor.getCursorPosition() : null,
                client_id: clientId
            }));
        }

        let cursorSendTimer = null;
        function sendCursor() {
            if (!wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;
            if (!currentFileId) return;
            ws.send(JSON.stringify({
                type: "cursor",
                file_id: currentFileId,
                cursor: editor.getCursorPosition(),
                client_id: clientId
            }));
        }

        function renderRemoteCursors() {
            const existing = editor.container.querySelectorAll(".remote-cursor-label");
            existing.forEach(el => el.remove());

            remoteCursors.forEach((info, id) => {
                const c = info.cursor;
                if (!c) return;
                const coords = editor.renderer.textToScreenCoordinates(c.row, c.column);
                const label = document.createElement("div");
                label.className = "remote-cursor-label";
                label.style.position = "fixed";
                label.style.left = `${coords.pageX + 6}px`;
                label.style.top = `${coords.pageY - 18}px`;
                label.style.padding = "2px 8px";
                label.style.borderRadius = "999px";
                label.style.background = "rgba(139, 92, 246, 0.2)";
                label.style.border = "1px solid rgba(139, 92, 246, 0.35)";
                label.style.color = "var(--text-primary)";
                label.style.fontSize = "11px";
                label.style.fontWeight = "700";
                label.style.pointerEvents = "none";
                label.textContent = info.username || "User";
                document.body.appendChild(label);
            });
        }

        // File Management
        async function loadFiles() {
            try {
                const res = await fetch(`/api/projects/${projectId}/files/`);
                fmData = await res.json();
                renderTree();
            } catch (e) { console.error("Load failed", e); }
        }

        function renderTree() {
            if (!fmTree) return;
            fmTree.innerHTML = '';
            
            const treeRoot = document.createElement('div');
            treeRoot.className = 'fm-tree-container';
            
            const rootFolders = fmData.folders.filter(f => !f.parent);
            const rootFiles = fmData.files.filter(f => !f.folder);

            rootFolders.forEach(f => treeRoot.appendChild(createFolderNode(f, 0)));
            rootFiles.forEach(f => treeRoot.appendChild(createFileNode(f, 0)));
            
            fmTree.appendChild(treeRoot);
        }

        function createFolderNode(folder, depth) {
            const node = document.createElement('div');
            const isExpanded = expandedFolders.has(`f-${folder.id}`);
            const subfolders = fmData.folders.filter(f => f.parent === folder.id);
            const files = fmData.files.filter(f => f.folder === folder.id);
            const hasChildren = subfolders.length > 0 || files.length > 0;

            node.innerHTML = `
                <div class="fm-item folder" style="padding-left: ${depth * 16 + 12}px">
                    <span style="width:10px">${hasChildren ? (isExpanded ? '<i class="fa-solid fa-chevron-down" style="font-size:10px"></i>' : '<i class="fa-solid fa-chevron-right" style="font-size:10px"></i>') : ''}</span>
                    <i class="fa-solid fa-folder" style="color: #ebcb8b"></i>
                    <span>${folder.name}</span>
                    <div class="fm-actions">
                        <button onclick="event.stopPropagation(); createNewIn('file', ${folder.id})" title="Новый файл"><i class="fa-solid fa-file-medical"></i></button>
                        <button onclick="event.stopPropagation(); createNewIn('folder', ${folder.id})" title="Новая папка"><i class="fa-solid fa-folder-plus"></i></button>
                        <button onclick="event.stopPropagation(); window.renameItem(${folder.id}, '${folder.name}')" title="Переименовать"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete" onclick="event.stopPropagation(); window.deleteItem(${folder.id}, 'folder', '${folder.name}', event)" title="Удалить"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `;

            node.onclick = (e) => {
                e.stopPropagation();
                if (isExpanded) expandedFolders.delete(`f-${folder.id}`);
                else expandedFolders.add(`f-${folder.id}`);
                renderTree();
            };

            if (isExpanded) {
                subfolders.forEach(f => node.appendChild(createFolderNode(f, depth + 1)));
                files.forEach(f => node.appendChild(createFileNode(f, depth + 1)));
            }
            return node;
        }

        function createFileNode(file, depth) {
            const node = document.createElement('div');
            node.className = `fm-item file ${currentFileId === file.id ? 'selected' : ''}`;
            node.style.paddingLeft = `${depth * 16 + 26}px`;

            node.innerHTML = `
                <i class="fa-solid fa-file-code" style="color: #81a1c1"></i>
                <span class="fm-name">${file.name}</span>
                <div class="fm-actions">
                    <button onclick="event.stopPropagation(); window.renameItem(${file.id}, '${file.name}')" title="Переименовать"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="delete" onclick="event.stopPropagation(); window.deleteItem(${file.id}, 'file', '${file.name}', event)" title="Удалить"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            node.onclick = (e) => {
                e.stopPropagation();
                openFile(file);
            };
            return node;
        }

        async function openFile(file) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
            remoteCursors.clear();
            renderRemoteCursors();

            currentFileId = file.id;
            if (currentFileNameEl) currentFileNameEl.textContent = file.name;
            
            const ext = file.name.split('.').pop().toLowerCase();
            const modes = { 'py': 'python', 'js': 'javascript', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown' };
            editor.session.setMode(`ace/mode/${modes[ext] || 'text'}`);

            updateSaveStatus("Подключение...", true);
            try {
                await connectWsWithTimeout(1200);
                if (Number(currentFileId) !== Number(file.id)) return;
                editor.setReadOnly(true);
                ws.send(JSON.stringify({ type: "join_file", file_id: file.id, client_id: clientId }));
                renderTree();
                return;
            } catch {}

            updateSaveStatus("Загрузка...", true);
            try {
                const res = await fetch(`/api/files/${file.id}/content/`);
                const data = await res.json();
                resetFileState(file.id, data.version || 0);
                applyingRemote = true;
                editor.setValue(data.content || "", -1);
                applyingRemote = false;
                editor.setReadOnly(false);
                updateSaveStatus("", false);
                renderTree();
            } catch (e) {
                console.error("Open failed", e);
                updateSaveStatus("Ошибка загрузки");
            }
        }

        // Auto Save
        editor.session.on("change", (delta) => {
            if (!currentFileId) return;
            if (applyingRemote) return;
            if (!delta || !delta.action) return;
            updateSaveStatus("Изменения...", true);
            if (wsReady && ws && ws.readyState === WebSocket.OPEN) {
                const st = getFileState(currentFileId);
                if (st) {
                    st.opQueue.push(delta);
                    flushFileQueue(currentFileId);
                }
                return;
            }

            clearTimeout(saveTimeout);
            const fileIdAtChange = currentFileId;
            saveTimeout = setTimeout(() => autoSave(fileIdAtChange), 800);
        });

        editor.session.selection.on("changeCursor", () => {
            clearTimeout(cursorSendTimer);
            cursorSendTimer = setTimeout(() => sendCursor(), 120);
        });

        async function autoSave(fileId) {
            if (!fileId) return;
            if (Number(fileId) !== Number(currentFileId)) return;
            const content = editor.getValue();
            const st = getFileState(fileId);
            
            try {
                const res = await fetch(`/api/files/${fileId}/content/`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ content, version: st ? st.rev : 0 })
                });
                let data = null;
                try {
                    data = await res.json();
                } catch {
                    const txt = await res.text();
                    updateSaveStatus(`Ошибка сохранения (${res.status})`, true);
                    if (txt && txt.length < 300) console.error("Save response:", txt);
                    return;
                }
                if (res.ok) {
                    if (st) st.rev = data.version;
                    updateSaveStatus('Сохранено');
                } else if (res.status === 409) {
                    const cursor = editor.getCursorPosition();
                    const scroll = editor.session.getScrollTop();
                    if (st) st.rev = data.current_version;
                    applyingRemote = true;
                    editor.setValue(data.content, -1);
                    applyingRemote = false;
                    editor.moveCursorToPosition(cursor);
                    editor.session.setScrollTop(scroll);
                    updateSaveStatus('Синхронизировано');
                } else {
                    const msg = data && (data.error || data.detail) ? `: ${data.error || data.detail}` : "";
                    updateSaveStatus(`Ошибка сохранения (${res.status})${msg}`, true);
                }
            } catch (e) { updateSaveStatus('Ошибка сети'); }
        }

        // Toolbar actions
        const btnCreateFile = document.getElementById('btn-create-file');
        const btnCreateFolder = document.getElementById('btn-create-folder');
        const btnUploadFile = document.getElementById('btn-upload-file');
        const btnRefresh = document.getElementById('btn-refresh');
        const btnDownload = document.getElementById('btn-fm-download');
        const btnHistory = document.getElementById('btn-history');
        const fmSearch = document.getElementById('fm-search');
        const tabSizeSelect = document.getElementById("tab-size");

        if (btnCreateFile) btnCreateFile.onclick = () => window.createNewIn('file', null);
        if (btnCreateFolder) btnCreateFolder.onclick = () => window.createNewIn('folder', null);
        if (btnUploadFile) {
            btnUploadFile.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = (e) => {
                    for (let file of e.target.files) uploadFile(file);
                };
                input.click();
            };
        }
        if (btnRefresh) btnRefresh.onclick = () => {
            btnRefresh.querySelector('i').classList.add('fa-spin');
            loadFiles().finally(() => {
                setTimeout(() => btnRefresh.querySelector('i').classList.remove('fa-spin'), 500);
            });
        };
        if (btnDownload) btnDownload.onclick = () => window.location.href = `/api/projects/${projectId}/download/`;
        if (btnHistory) btnHistory.onclick = async () => {
            if (!currentFileId) return Modal.alert("История", "Сначала открой файл");
            try {
                const res = await fetch(`/api/files/${currentFileId}/revisions/`);
                const data = await res.json();
                if (!res.ok) return Modal.alert("Ошибка", data.error || "Не удалось загрузить историю");

                const items = (data.revisions || []).map(r => {
                    const who = r.created_by ? ` • ${r.created_by}` : "";
                    const when = r.created_at ? ` • ${new Date(r.created_at).toLocaleString()}` : "";
                    return `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px solid var(--border-color); border-radius:16px; background:rgba(255,255,255,0.03); margin-bottom:10px">
                            <div style="min-width:0">
                                <div style="font-weight:800">v${r.version}${who}</div>
                                <div style="color:var(--text-secondary); font-size:12px">${when}</div>
                            </div>
                            <button class="btn secondary" style="padding:0.65rem 1rem" onclick="window.rollbackToRevision(${r.id})">Откат</button>
                        </div>
                    `;
                }).join("");

                window.rollbackToRevision = async (revisionId) => {
                    Modal.confirm("Откат", "Вернуть файл к выбранной версии?", async () => {
                        try {
                            const rr = await fetch(`/api/files/${currentFileId}/rollback/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
                                body: JSON.stringify({ revision_id: revisionId })
                            });
                            const rd = await rr.json();
                            if (rr.ok) {
                                updateSaveStatus("Откат выполнен", true);
                            } else {
                                Modal.alert("Ошибка", rd.error || "Не удалось откатить");
                            }
                        } catch {
                            Modal.alert("Ошибка", "Ошибка сети");
                        }
                    });
                };

                Modal.show("История изменений", items || "<p>История пуста</p>", "alert", null);
            } catch {
                Modal.alert("Ошибка", "Ошибка сети");
            }
        };
        
        if (fmSearch) fmSearch.oninput = (e) => {
            searchQuery = e.target.value;
            // Filter fmData locally or re-render
            renderTree();
        };

        if (tabSizeSelect) {
            tabSizeSelect.onchange = () => {
                const v = parseInt(tabSizeSelect.value, 10);
                if (!Number.isNaN(v)) editor.session.setTabSize(v);
            };
        }

        ensureWs();
        window.createNewIn = async function(type, parentId) {
            Modal.prompt(`Новая ${type === 'file' ? 'файл' : 'папка'}`, `Введите имя:`, "", async (name) => {
                if (!name || /[<>:"/\\|?*]/.test(name)) return Modal.alert("Ошибка", "Некорректное имя");

                try {
                    const res = await fetch(`/api/projects/${projectId}/${type === 'file' ? 'create-file' : 'create-folder'}/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                        body: JSON.stringify({ name, parent: parentId })
                    });
                    if (res.ok) {
                        if (parentId) expandedFolders.add(`f-${parentId}`);
                        loadFiles();
                    } else {
                        Modal.alert("Ошибка", "Не удалось создать");
                    }
                } catch (e) { Modal.alert("Ошибка", "Сбой при создании"); }
            });
        };

        window.deleteItem = async function(id, type, name, event) {
            if (event) event.stopPropagation();
            Modal.confirm("Удаление", `Удалить ${name}?`, async () => {
                try {
                    const res = await fetch(`/api/files/${id}/`, {
                        method: 'DELETE',
                        headers: { 'X-CSRFToken': getCookie('csrftoken') }
                    });
                    if (res.ok) {
                        if (id === currentFileId) {
                            currentFileId = null;
                            editor.setValue("");
                            if (currentFileNameEl) currentFileNameEl.textContent = "Выберите файл";
                        }
                        loadFiles();
                    }
                } catch (e) { console.error("Delete failed", e); }
            });
        };

        window.renameItem = async function(id, oldName) {
            Modal.prompt("Переименование", "Новое имя:", oldName, async (newName) => {
                if (newName && newName !== oldName) {
                    if (/[<>:"/\\|?*]/.test(newName)) return Modal.alert("Ошибка", "Некорректное имя");
                    
                    try {
                        await fetch(`/api/files/${id}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                            body: JSON.stringify({ name: newName })
                        });
                        if (id === currentFileId && currentFileNameEl) currentFileNameEl.textContent = newName;
                        loadFiles();
                    } catch (e) { console.error("Rename failed", e); }
                }
            });
        };

        async function uploadFile(file) {
            const formData = new FormData();
            formData.append('files', file);
            formData.append('paths', file.name);

            const xhr = new XMLHttpRequest();
            const progressContainer = document.getElementById('upload-progress-container');
            const progressId = 'up-' + Math.random().toString(36).substr(2, 9);
            
            progressContainer.insertAdjacentHTML('beforeend', `
                <div class="upload-progress-item" id="${progressId}" style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid var(--border-color)">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px">${file.name}</span>
                        <span class="pct">0%</span>
                    </div>
                    <div class="progress-bar-bg" style="background:#222; height:4px; border-radius:2px; overflow:hidden">
                        <div class="progress-bar-fill" style="background:var(--accent-color); width:0%; height:100%; transition:0.2s"></div>
                    </div>
                </div>
            `);
            
            const item = document.getElementById(progressId);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    item.querySelector('.pct').textContent = pct + '%';
                    item.querySelector('.progress-bar-fill').style.width = pct + '%';
                }
            };

            xhr.onload = () => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    setTimeout(() => item.remove(), 500);
                }, 1000);
                if (xhr.status === 201 || xhr.status === 200) {
                    loadFiles();
                } else {
                    Modal.alert("Ошибка", `Не удалось загрузить ${file.name}`);
                }
            };

            xhr.open('POST', `/api/projects/${projectId}/upload/`);
            xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
            xhr.send(formData);
        }

        loadFiles();
    }
});
