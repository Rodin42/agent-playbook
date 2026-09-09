# sandbox.Dockerfile — the image every factory sandbox starts from (`factory template build`).
# Base: Node 22 + git + the harnesses. Add YOUR project's toolchain below the marker so the
# implementer can run the full local check (substrate §6) inside the sandbox.
FROM node:22-bookworm
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends git make curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*
# Harnesses: claude-code (default; its postinstall fetches the native binary — never --ignore-scripts)
# and pi (installed, unconfigured — the one-line switch target)
RUN npm install -g @anthropic-ai/claude-code \
    && npm install -g @earendil-works/pi-coding-agent --ignore-scripts
# --- project toolchain below this line (examples) -----------------------------------------
# Python via uv (system-wide, visible to the sandbox `user`):
# RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
#     && uv python install 3.13 --install-dir /opt/uv/python && chmod -R a+rX /opt/uv \
#     && ln -s "$(ls -d /opt/uv/python/cpython-3.13.*-linux-x86_64-gnu | head -1)/bin/python3.13" /usr/local/bin/python3.13
# RUN apt-get update && apt-get install -y postgresql-17                                              # a database the tests need
