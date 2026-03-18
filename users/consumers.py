import json
import asyncio

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .collab_state import apply_ace_delta, ensure_doc, get_doc, join_lines
from .models import File, ProjectMember, FileRevision

class EditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.room_group_name = f'editor_{self.project_id}'
        self.user = self.scope.get("user")
        self.client_id = None
        self.current_file_id = None

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        await self._presence_update(join=True)

    async def disconnect(self, close_code):
        await self._presence_update(join=False)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == "hello":
            self.client_id = data.get("client_id")
            await self._presence_update(join=True)
            return

        if event_type == "join_file":
            file_id = int(data.get("file_id"))
            self.current_file_id = file_id
            if self.client_id is None:
                self.client_id = data.get("client_id")

            ok, payload = await self._load_file_state(file_id)
            if not ok:
                await self.send(text_data=json.dumps({"type": "error", "message": payload}))
                return

            await self.send(text_data=json.dumps({
                "type": "file_state",
                "file_id": file_id,
                "content": payload["content"],
                "rev": payload["rev"],
                "last_modified_by": payload.get("last_modified_by"),
            }))
            await self._presence_update(join=True)
            return

        if event_type == "op":
            file_id = int(data.get("file_id"))
            if self.current_file_id != file_id:
                self.current_file_id = file_id

            can_edit = await self._can_edit(file_id)
            if not can_edit:
                await self.send(text_data=json.dumps({"type": "error", "message": "no_edit_permission"}))
                return

            delta = data.get("delta") or {}
            base_rev = int(data.get("base_rev", 0))

            doc = get_doc(int(self.project_id), file_id)
            if doc is None:
                ok, payload = await self._load_file_state(file_id)
                if not ok:
                    await self.send(text_data=json.dumps({"type": "error", "message": payload}))
                    return
                doc = get_doc(int(self.project_id), file_id)

            current_rev = int(doc["rev"])
            if base_rev != current_rev:
                content = join_lines(list(doc["lines"]))
                await self.send(text_data=json.dumps({
                    "type": "resync",
                    "file_id": file_id,
                    "content": content,
                    "rev": current_rev,
                }))
                return

            lines = list(doc["lines"])
            lines = apply_ace_delta(lines, delta)
            doc["lines"] = lines
            doc["rev"] = current_rev + 1

            new_rev = int(doc["rev"])
            content = join_lines(list(lines))
            await self._persist_file(file_id=file_id, rev=new_rev, content=content)
            await self._maybe_snapshot(file_id=file_id, rev=new_rev, content=content)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_op",
                    "file_id": file_id,
                    "rev": new_rev,
                    "delta": delta,
                    "cursor": data.get("cursor"),
                    "username": getattr(self.user, "username", "Anonymous"),
                    "client_id": self.client_id,
                }
            )
            return

        if event_type == "cursor":
            file_id = int(data.get("file_id"))
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_cursor",
                    "file_id": file_id,
                    "cursor": data.get("cursor"),
                    "username": getattr(self.user, "username", "Anonymous"),
                    "client_id": self.client_id,
                }
            )
            return

    async def broadcast_op(self, event):
        await self.send(text_data=json.dumps({
            "type": "op",
            "file_id": event["file_id"],
            "rev": event["rev"],
            "delta": event["delta"],
            "cursor": event.get("cursor"),
            "username": event.get("username", "Anonymous"),
            "client_id": event.get("client_id"),
        }))

    async def broadcast_cursor(self, event):
        await self.send(text_data=json.dumps({
            "type": "cursor",
            "file_id": event.get("file_id"),
            "cursor": event.get("cursor"),
            "username": event.get("username", "Anonymous"),
            "client_id": event.get("client_id"),
        }))

    async def broadcast_presence(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence",
            "users": event.get("users", []),
            "project_id": int(self.project_id),
        }))

    async def broadcast_resync(self, event):
        await self.send(text_data=json.dumps({
            "type": "resync",
            "file_id": event["file_id"],
            "content": event["content"],
            "rev": event["rev"],
            "reason": event.get("reason"),
        }))

    async def _load_file_state(self, file_id: int):
        file_obj = await sync_to_async(File.objects.select_related("project", "last_modified_by").get)(pk=file_id)
        project = file_obj.project

        is_member = await sync_to_async(ProjectMember.objects.filter(project=project, user=self.user).exists)()
        can_read = project.owner_id == getattr(self.user, "id", None) or is_member or project.is_public
        if not can_read:
            return False, "no_read_permission"

        path = file_obj.file.path
        try:
            content = await asyncio.to_thread(_read_text_file, path)
        except FileNotFoundError:
            content = ""

        doc = ensure_doc(int(self.project_id), int(file_id), content=content, rev=int(file_obj.version))
        return True, {
            "content": join_lines(list(doc["lines"])),
            "rev": int(doc["rev"]),
            "last_modified_by": file_obj.last_modified_by.username if file_obj.last_modified_by else None,
        }

    async def _can_edit(self, file_id: int) -> bool:
        file_obj = await sync_to_async(File.objects.select_related("project").get)(pk=file_id)
        project = file_obj.project
        if project.owner_id == getattr(self.user, "id", None):
            return True
        if project.is_public and getattr(self.user, "is_authenticated", False):
            return True
        member = await sync_to_async(ProjectMember.objects.filter(project=project, user=self.user).first)()
        return bool(member and member.permission == "edit")

    async def _persist_file(self, *, file_id: int, rev: int, content: str):
        file_obj = await sync_to_async(File.objects.get)(pk=file_id)
        await asyncio.to_thread(_write_text_file, file_obj.file.path, content)
        file_obj.version = int(rev)
        file_obj.size = len(content.encode("utf-8"))
        if getattr(self.user, "is_authenticated", False):
            file_obj.last_modified_by = self.user
        await sync_to_async(file_obj.save)()

    async def _maybe_snapshot(self, *, file_id: int, rev: int, content: str):
        doc = get_doc(int(self.project_id), int(file_id))
        if doc is None:
            return
        if rev % 20 != 0:
            return
        snapshot_rev = int(doc.get("snapshot_rev", -1))
        if snapshot_rev == rev:
            return
        doc["snapshot_rev"] = rev

        file_obj = await sync_to_async(File.objects.get)(pk=file_id)
        await sync_to_async(FileRevision.objects.create)(
            file=file_obj,
            version=rev,
            content=content,
            created_by=self.user if getattr(self.user, "is_authenticated", False) else None,
        )

    async def _presence_update(self, *, join: bool):
        from .collab_state import presence as presence_state

        project_id = int(self.project_id)
        if project_id not in presence_state:
            presence_state[project_id] = {}

        if join:
            presence_state[project_id][self.channel_name] = {
                "username": getattr(self.user, "username", "Anonymous"),
                "user_id": getattr(self.user, "id", None),
                "client_id": self.client_id,
                "file_id": self.current_file_id,
            }
        else:
            presence_state[project_id].pop(self.channel_name, None)

        users = []
        for info in presence_state[project_id].values():
            users.append({
                "username": info.get("username", "Anonymous"),
                "user_id": info.get("user_id"),
                "client_id": info.get("client_id"),
                "file_id": info.get("file_id"),
            })

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_presence",
                "users": users,
            }
        )


def _read_text_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _write_text_file(path: str, content: str):
    import os

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
