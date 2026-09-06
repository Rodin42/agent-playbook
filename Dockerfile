# Optional: run the console + orchestrator identically on any container host.
# Not required for local dev (node + git + gh on the host is enough).
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci && npm run build --workspaces --if-present
# Mount your workspace of project repos at /workspace
VOLUME /workspace
EXPOSE 4571
CMD ["node", "packages/orchestrator/dist/cli.js", "ui", "--workspace", "/workspace", "--host", "0.0.0.0"]
