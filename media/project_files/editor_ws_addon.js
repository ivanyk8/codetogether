// ============================================================
// ВСТАВЬ ЭТО в editor.html, ВНУТРИ <script> после инициализации Ace Editor
// (после строки: const editor = ace.edit("editor"); )
// ============================================================

// === REALTIME COLLABORATION VIA WEBSOCKET ===
const currentProjectId = {{ project_id }};
const currentUsername = "{{ request.user.username }}";
let wsReady = false;
let suppressRemoteChange = false;

// Indicator UI (добавь в HTML где удобно)
const wsIndicator = document.createElement('div');
wsIndicator.id = 'ws-indicator';
wsIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    background: #333;
    color: #888;
    z-index: 9999;
    transition: all 0.3s;
`;
wsIndicator.textContent = '● Подключение...';
document.body.appendChild(wsIndicator);

// Remote cursor marker
let remoteCursorMarker = null;
const remoteCursorStyle = document.createElement('style');
remoteCursorStyle.textContent = `
    .remote-cursor {
        position: absolute;
        border-left: 2px solid #ff6b6b;
        height: 18px !important;
    }
    .remote-cursor-label {
        position: absolute;
        background: #ff6b6b;
        color: white;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 3px;
        white-space: nowrap;
        top: -16px;
        left: 0;
    }
`;
document.head.appendChild(remoteCursorStyle);

// WebSocket connection
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws/editor/${currentProjectId}/`;
let ws;

function connectWS() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        wsReady = true;
        wsIndicator.textContent = '● Онлайн';
        wsIndicator.style.color = '#4caf50';
        wsIndicator.style.background = 'rgba(76,175,80,0.15)';
    };

    ws.onclose = () => {
        wsReady = false;
        wsIndicator.textContent = '● Отключён';
        wsIndicator.style.color = '#f44336';
        wsIndicator.style.background = 'rgba(244,67,54,0.15)';
        // Reconnect after 3s
        setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
        wsIndicator.textContent = '● Ошибка';
        wsIndicator.style.color = '#ff9800';
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'code_change') {
            // Only update if it's for the currently open file
            if (data.file_id === currentFileId) {
                suppressRemoteChange = true;
                const cursorPos = editor.getCursorPosition();
                editor.setValue(data.content, -1);
                editor.moveCursorToPosition(cursorPos);
                suppressRemoteChange = false;

                // Update local cache
                if (currentFileId) {
                    filesContent[currentFileId] = data.content;
                }
            }
        }

        if (data.type === 'cursor_move') {
            // Show remote cursor
            showRemoteCursor(data.cursor, data.username);
        }
    };
}

connectWS();

// Send code changes via WebSocket
let wsDebounce = null;
editor.on('change', () => {
    if (suppressRemoteChange || !wsReady || !currentFileId) return;

    clearTimeout(wsDebounce);
    wsDebounce = setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'code_change',
            file_id: currentFileId,
            content: editor.getValue(),
            cursor: editor.getCursorPosition(),
        }));
    }, 50); // 50ms debounce - почти реальное время
});

// Send cursor position
editor.selection.on('changeCursor', () => {
    if (!wsReady) return;
    ws.send(JSON.stringify({
        type: 'cursor_move',
        cursor: editor.getCursorPosition(),
        username: currentUsername,
    }));
});

// Show remote cursor in editor
function showRemoteCursor(cursor, username) {
    if (!cursor) return;

    // Remove old marker
    if (remoteCursorMarker !== null) {
        editor.session.removeMarker(remoteCursorMarker);
        remoteCursorMarker = null;
    }

    const Range = ace.require('ace/range').Range;
    const range = new Range(cursor.row, cursor.column, cursor.row, cursor.column + 1);

    remoteCursorMarker = editor.session.addMarker(range, 'remote-cursor', 'text', true);

    // Show label
    let label = document.getElementById('remote-cursor-label');
    if (!label) {
        label = document.createElement('div');
        label.id = 'remote-cursor-label';
        label.className = 'remote-cursor-label';
        document.querySelector('.ace_layer.ace_text-layer')?.appendChild(label);
    }
    label.textContent = username;
}
