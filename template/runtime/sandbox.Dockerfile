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
# RUN curl -LsSf https://astral.sh/uv/install.sh | sh && mv /root/.local/bin/uv /usr/local/bin/uv   # Python via uv
# RUN apt-get update && apt-get install -y postgresql-17                                              # a database the tests need
