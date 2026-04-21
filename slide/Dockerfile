# edinet-ma ノンネーム資料生成 STF の Docker image
#
# Vercel / Next.js 側からは d6e STF instant-run で呼び出される。
# 直接起動する場合は stf_entrypoint.py に stdin JSON を流し込む。
#
#   docker build -t edinet-ma-nonname:dev slide/
#   echo '{"operation":"describe"}' | docker run --rm -i edinet-ma-nonname:dev

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 依存のみ先にインストールして layer cache を効かせる
COPY requirements.txt ./
RUN pip install -r requirements.txt

# スライド生成コード本体 (docker build context は slide/ 配下)
COPY slide_generator.py stf_entrypoint.py ./
COPY assets ./assets

ENTRYPOINT ["python", "/app/stf_entrypoint.py"]
