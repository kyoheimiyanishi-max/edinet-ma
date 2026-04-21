#!/usr/bin/env python3
"""d6e STF Docker Runtime エントリポイント（ノンネーム資料生成）

プロトコル:
  stdin  -- JSON
    - {"operation": "describe"}
        → describe レスポンスを stdout に返して終了
    - d6e STF 実行ペイロード (workspace_id / stf_id / input / api_url / api_token ...)
        → input.spec を slide_generator.generate() に渡して .pptx 生成
        → d6e /files API に base64 JSON で upload
        → stdout に {"output": {"file_id", "filename", "size", "content_type"}}
  stdout -- JSON のみ 1 行（ログは stderr）

ローカル smoke test モード (環境変数 SLIDE_SKIP_UPLOAD=1):
  /files upload をスキップし、/tmp/<filename>.pptx に書き出して
  stdout に {"output": {"path": "/tmp/..."}} を返す。
  docker build 後に d6e を介さず単体確認するためのもの。
"""
from __future__ import annotations

import base64
import json
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import requests

# slide_generator.generate を再利用
sys.path.insert(0, str(Path(__file__).resolve().parent))
from slide_generator import generate  # noqa: E402

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("nonname-stf")


def _emit(payload: dict[str, Any]) -> None:
    """stdout に JSON を 1 行で出力して終了する"""
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _describe() -> dict[str, Any]:
    return {
        "name": "edinet-ma-nonname",
        "description": "M&A ノンネーム資料 (.pptx) を生成し d6e storage にアップロードする STF",
        "input_schema": {
            "type": "object",
            "required": ["spec"],
            "properties": {
                "spec": {
                    "type": "object",
                    "description": (
                        "slide_generator.py のスペック JSON。 "
                        "lib/slide/nonname-spec.ts が生成するのと同じ形式"
                    ),
                },
                "filename": {
                    "type": "string",
                    "description": "保存ファイル名 (省略時: nonname-<timestamp>.pptx)",
                },
            },
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_id": {"type": "string"},
                "filename": {"type": "string"},
                "size": {"type": "integer"},
                "content_type": {"type": "string"},
            },
        },
    }


def _default_filename() -> str:
    import datetime

    ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    return f"nonname-{ts}.pptx"


def _upload_to_d6e(
    api_url: str,
    api_token: str,
    workspace_id: str,
    stf_id: str,
    filename: str,
    content: bytes,
) -> dict[str, Any]:
    """d6e の JSON upload エンドポイントに base64 で送る"""
    url = f"{api_url}/api/v1/workspaces/{workspace_id}/files"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "X-Internal-Bypass": "true",
        "X-Workspace-ID": workspace_id,
        "X-STF-ID": stf_id,
        "Content-Type": "application/json",
    }
    body = {
        "filename": filename,
        "content_type": (
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ),
        "content": base64.b64encode(content).decode("ascii"),
    }
    resp = requests.post(url, headers=headers, json=body, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(
            f"d6e /files upload failed: {resp.status_code} {resp.text[:500]}"
        )
    return resp.json()


def _execute(payload: dict[str, Any]) -> dict[str, Any]:
    user_input = payload.get("input") or {}
    spec = user_input.get("spec")
    if not isinstance(spec, dict):
        raise ValueError("input.spec must be an object (slide_generator spec JSON)")

    filename = str(user_input.get("filename") or _default_filename())
    if not filename.endswith(".pptx"):
        filename += ".pptx"

    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / filename
        generate(spec, out_path)
        content = out_path.read_bytes()
    size = len(content)
    log.info("generated pptx: filename=%s size=%d", filename, size)

    if os.environ.get("SLIDE_SKIP_UPLOAD") == "1":
        # ローカル smoke test 用。/files を叩かず /tmp に書き出すだけ
        local = Path(tempfile.gettempdir()) / filename
        local.write_bytes(content)
        log.warning("SLIDE_SKIP_UPLOAD=1: wrote to %s (not uploaded)", local)
        return {
            "output": {
                "path": str(local),
                "filename": filename,
                "size": size,
            }
        }

    api_url = payload.get("api_url")
    api_token = payload.get("api_token")
    workspace_id = payload.get("workspace_id")
    stf_id = payload.get("stf_id") or ""
    if not (api_url and api_token and workspace_id):
        raise ValueError(
            "missing api_url/api_token/workspace_id in STF payload; "
            "set SLIDE_SKIP_UPLOAD=1 for offline dry-run"
        )

    uploaded = _upload_to_d6e(
        api_url=api_url,
        api_token=api_token,
        workspace_id=workspace_id,
        stf_id=stf_id,
        filename=filename,
        content=content,
    )
    return {
        "output": {
            "file_id": uploaded.get("id"),
            "filename": uploaded.get("filename", filename),
            "size": uploaded.get("size", size),
            "content_type": uploaded.get("content_type"),
        }
    }


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("empty stdin")
        payload = json.loads(raw)
    except Exception as e:  # noqa: BLE001
        log.exception("failed to parse stdin")
        _emit({"error": f"invalid stdin: {e}"})
        return 1

    try:
        if payload.get("operation") == "describe":
            _emit({"output": _describe()})
            return 0
        result = _execute(payload)
        _emit(result)
        return 0
    except Exception as e:  # noqa: BLE001
        log.exception("STF execution failed")
        _emit({"error": str(e)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
