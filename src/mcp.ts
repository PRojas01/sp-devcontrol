/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { getDb, insertSession, listSessions, getChangesForSession, updateChangeStatus, getChange } from "./storage.js";
import type { JsonDb } from "./storage.js";
import { evaluatePathRisk, evaluateCommandRisk } from "./policy.js";
import { loadConfig, hasConfig } from "./config.js";
import { VERSION } from "./version.js";
import { DB_PATH } from "./paths.js";
import { runPreflightChecks } from "./preflight.js";
import { generateSessionId, createSession } from "./session.js";
import { generateComplianceReport, renderComplianceMarkdown } from "./compliance.js";

const DEFAULT_HTTP_PORT = 7893;
const MAX_MCP_SESSIONS = 50;
const MCP_SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

// Per-project DB cache — avoids the singleton issue in storage.ts getDb()
const mcpDbCache = new Map<string, JsonDb>();

function getMcpDb(projectRoot: string): JsonDb {
  const dbPath = resolve(join(projectRoot, DB_PATH));
  const key = dbPath.endsWith(".json") ? dbPath : `${dbPath}.json`;
  if (!mcpDbCache.has(key)) {
    mcpDbCache.set(key, getDb(join(projectRoot, DB_PATH)));
  }
  return mcpDbCache.get(key)!;
}

function buildMcpServer(defaultProjectRoot?: string): McpServer {
  const server = new McpServer({
    name: "sp-devcontrol",
    version: VERSION,
  });

  function resolveRoot(params: { projectRoot?: string }): string {
    return params.projectRoot ?? defaultProjectRoot ?? process.cwd();
  }

  server.registerTool(
    "devcontrol_status",
    {
      description: "Returns the current project status: preflight checks, active session, and recent changes.",
      inputSchema: {
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const projectRoot = resolveRoot(params);
      const lines: string[] = [];

      lines.push(`# DevControl Status`);
      lines.push(`**Project:** ${projectRoot}`);
      lines.push(`**Time:** ${new Date().toISOString()}`);
      lines.push("");

      if (!hasConfig(projectRoot)) {
        lines.push("⚠ DevControl is not initialized in this project. Run `devcontrol init` first.");
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      }

      const preflight = runPreflightChecks(projectRoot);
      lines.push(`## Preflight`);
      lines.push(`Phase: **${preflight.phase}**`);
      const errors = preflight.checks.filter(c => c.severity === "error" && !c.passed);
      const warnings = preflight.checks.filter(c => c.severity === "warning" && !c.passed);
      if (errors.length > 0) {
        lines.push(`Errors (${errors.length}): ${errors.map(c => c.id).join(", ")}`);
      }
      if (warnings.length > 0) {
        lines.push(`Warnings (${warnings.length}): ${warnings.map(c => c.id).join(", ")}`);
      }
      if (errors.length === 0 && warnings.length === 0) {
        lines.push("All checks passed.");
      }
      lines.push("");

      const db = getMcpDb(projectRoot);
      const sessions = listSessions(db, 5);
      const active = sessions.find(s => s.status === "active");

      lines.push("## Active Session");
      if (active) {
        lines.push(`**ID:** ${active.id}`);
        lines.push(`**Agent:** ${active.agent}`);
        lines.push(`**Started:** ${active.startedAt}`);
        if (active.objective) lines.push(`**Objective:** ${active.objective}`);
        lines.push(`**Changes:** total=${active.totalChanges} approved=${active.approved} rejected=${active.rejected}`);

        const changes = getChangesForSession(db, active.id);
        const pending = changes.filter(c => c.status === "pending");
        if (pending.length > 0) {
          lines.push("");
          lines.push(`## Pending Changes (${pending.length})`);
          for (const ch of pending) {
            lines.push(`- \`${ch.id}\` — ${ch.files?.map(f => f.filepath).join(", ") ?? "no files"}`);
          }
        }
      } else {
        lines.push("No active session.");
        if (sessions.length > 0) {
          const last = sessions[0];
          lines.push(`Last session: \`${last.id}\` (${last.status ?? "completed"}) at ${last.startedAt}`);
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  server.registerTool(
    "devcontrol_session_start",
    {
      description: "Start a new DevControl governance session.",
      inputSchema: {
        objective: z.string().describe("Goal or task description for this session"),
        agent: z.string().optional().describe("Agent identifier (default: mcp-agent)"),
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const { objective, agent } = params;
      const projectRoot = resolveRoot(params);

      if (!hasConfig(projectRoot)) {
        return {
          content: [{
            type: "text" as const,
            text: "DevControl is not initialized. Run `devcontrol init` first.",
          }],
          isError: true,
        };
      }

      const db = getMcpDb(projectRoot);
      const sessions = listSessions(db, 10);
      const alreadyActive = sessions.find(s => s.status === "active");
      if (alreadyActive) {
        return {
          content: [{
            type: "text" as const,
            text: `A session is already active: \`${alreadyActive.id}\`. End it before starting a new one.`,
          }],
          isError: true,
        };
      }

      const id = generateSessionId(new Date(), sessions.length);
      const session = createSession(id, projectRoot, agent ?? "mcp-agent", "watch");
      session.objective = objective;
      session.status = "active";
      insertSession(db, session);

      return {
        content: [{
          type: "text" as const,
          text: `Session started.\n**ID:** ${id}\n**Agent:** ${session.agent}\n**Objective:** ${objective}`,
        }],
      };
    },
  );

  server.registerTool(
    "devcontrol_approve_change",
    {
      description: "Approve a pending change by ID.",
      inputSchema: {
        changeId: z.string().describe("Change ID to approve (e.g. ds-20260625-001-c01)"),
        message: z.string().optional().describe("Optional approval note"),
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const { changeId, message } = params;
      const projectRoot = resolveRoot(params);
      const db = getMcpDb(projectRoot);
      const change = getChange(db, changeId);

      if (!change) {
        return {
          content: [{ type: "text" as const, text: `Change \`${changeId}\` not found.` }],
          isError: true,
        };
      }

      if (change.status !== "pending") {
        return {
          content: [{
            type: "text" as const,
            text: `Change \`${changeId}\` is not pending (current status: ${change.status}).`,
          }],
          isError: true,
        };
      }

      updateChangeStatus(db, changeId, "approved", undefined, undefined, message);

      return {
        content: [{
          type: "text" as const,
          text: `Change \`${changeId}\` approved.${message ? `\nNote: ${message}` : ""}`,
        }],
      };
    },
  );

  server.registerTool(
    "devcontrol_reject_change",
    {
      description: "Reject a pending change by ID.",
      inputSchema: {
        changeId: z.string().describe("Change ID to reject"),
        message: z.string().optional().describe("Reason for rejection"),
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const { changeId, message } = params;
      const projectRoot = resolveRoot(params);
      const db = getMcpDb(projectRoot);
      const change = getChange(db, changeId);

      if (!change) {
        return {
          content: [{ type: "text" as const, text: `Change \`${changeId}\` not found.` }],
          isError: true,
        };
      }

      if (change.status !== "pending") {
        return {
          content: [{
            type: "text" as const,
            text: `Change \`${changeId}\` is not pending (current status: ${change.status}).`,
          }],
          isError: true,
        };
      }

      updateChangeStatus(db, changeId, "rejected", undefined, undefined, message);

      return {
        content: [{
          type: "text" as const,
          text: `Change \`${changeId}\` rejected.${message ? `\nReason: ${message}` : ""}`,
        }],
      };
    },
  );

  server.registerTool(
    "devcontrol_policy_check",
    {
      description: "Evaluate the risk level of a file path or shell command against project policy.",
      inputSchema: {
        type: z.enum(["path", "command"]).describe("Whether to evaluate a file path or shell command"),
        value: z.string().describe("The path or command to evaluate"),
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const { type, value } = params;
      const projectRoot = resolveRoot(params);
      const lines: string[] = [];

      if (type === "path") {
        const result = evaluatePathRisk(projectRoot, value);
        lines.push(`## Path Risk: \`${value}\``);
        lines.push(`**Risk:** ${result.risk}`);
        lines.push(`**Protected:** ${result.protected ? "yes" : "no"}`);
        lines.push(`**Approved:** ${result.approved ? "yes" : "no"}`);
        if (result.reason) lines.push(`**Reason:** ${result.reason}`);
      } else {
        const result = evaluateCommandRisk(projectRoot, value);
        lines.push(`## Command Risk: \`${value}\``);
        lines.push(`**Decision:** ${result.decision}`);
        if (result.approvalSource) lines.push(`**Approval source:** ${result.approvalSource}`);
        if (result.reason) lines.push(`**Reason:** ${result.reason}`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  server.registerTool(
    "devcontrol_compliance_report",
    {
      description: "Generate a full compliance report for the current project in Markdown.",
      inputSchema: {
        projectRoot: z.string().optional().describe("Absolute path to project root (defaults to server CWD)"),
      },
    },
    async (params) => {
      const projectRoot = resolveRoot(params);

      if (!hasConfig(projectRoot)) {
        return {
          content: [{
            type: "text" as const,
            text: "DevControl is not initialized. Run `devcontrol init` first.",
          }],
          isError: true,
        };
      }

      const db = getMcpDb(projectRoot);
      const report = generateComplianceReport(projectRoot, db);
      const markdown = renderComplianceMarkdown(report);

      return { content: [{ type: "text" as const, text: markdown }] };
    },
  );

  return server;
}

export async function startMcpStdio(projectRoot?: string): Promise<void> {
  const server = buildMcpServer(projectRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function serveStdio(projectRoot?: string): Promise<void> {
  return startMcpStdio(projectRoot);
}

export async function serveMcp(opts: { port?: number; token?: string; projectRoot?: string } = {}): Promise<void> {
  return startMcpHttp(opts.port, opts.token, opts.projectRoot);
}

let httpServer: ReturnType<typeof createServer> | null = null;

export async function startMcpHttp(
  port: number = DEFAULT_HTTP_PORT,
  token?: string,
  defaultProjectRoot?: string,
): Promise<void> {
  if (httpServer) return;

  const sessions = new Map<string, StreamableHTTPServerTransport>();
  const sessionCreatedAt = new Map<string, number>();

  function cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [id, ts] of sessionCreatedAt) {
      if (now - ts > MCP_SESSION_TTL_MS) {
        sessions.delete(id);
        sessionCreatedAt.delete(id);
      }
    }
  }

  httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Token auth: required if token is configured
    if (token) {
      const auth = req.headers["authorization"];
      if (!auth || auth !== `Bearer ${token}`) {
        res.writeHead(401).end("Unauthorized");
        return;
      }
    }

    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    if (req.method === "POST" || req.method === "GET" || req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      let transport: StreamableHTTPServerTransport;

      if (sessionId && sessions.has(sessionId)) {
        transport = sessions.get(sessionId)!;
      } else if (!sessionId && req.method === "POST") {
        cleanExpiredSessions();
        if (sessions.size >= MAX_MCP_SESSIONS) {
          res.writeHead(503).end("Too many active MCP sessions");
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, transport);
            sessionCreatedAt.set(id, Date.now());
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            sessionCreatedAt.delete(transport.sessionId);
          }
        };
        const mcpServer = buildMcpServer(defaultProjectRoot);
        await mcpServer.connect(transport);
      } else {
        res.writeHead(400).end("Bad request: missing or unknown session ID");
        return;
      }

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
        try {
          await transport.handleRequest(req, res, body);
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500).end("Internal server error");
          }
        }
      });
    } else {
      res.writeHead(405).end("Method not allowed");
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, "127.0.0.1", () => resolve());
    httpServer!.on("error", reject);
  });
}

export async function stopMcpHttp(): Promise<void> {
  if (!httpServer) return;
  await new Promise<void>((resolve, reject) => {
    httpServer!.close((err) => (err ? reject(err) : resolve()));
  });
  httpServer = null;
}
