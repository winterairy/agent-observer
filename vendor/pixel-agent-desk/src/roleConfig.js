/**
 * Role Config — maps Claude Code subagent types (and the main session) to a
 * fixed character and display name.
 *
 * Source: public/shared/roles.json
 *   {
 *     "lead":    { "name": "책임자", "avatar": "lead.webp" },
 *     "planner": { "name": "기획",   "avatar": "planner.webp" }
 *   }
 *
 * - "lead" is used for main (non-subagent, non-teammate) sessions.
 * - Other keys are matched against the subagent's agent_type
 *   (the `name` in .claude/agents/<name>.md). A plugin prefix such as
 *   "my-plugin:planner" also matches "planner".
 * - Every avatar file must also be listed in public/shared/avatars.json
 *   (run `npm run roles:sync` to do that automatically).
 */

const path = require('path');
const fs = require('fs');

const ROLES_PATH = path.join(__dirname, '..', 'public', 'shared', 'roles.json');
const AVATAR_FILES = require('../public/shared/avatars.json');

function loadRoles() {
  try {
    const raw = fs.readFileSync(ROLES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn(`[RoleConfig] Failed to read roles.json: ${e.message}`);
    }
    return {};
  }
}

const ROLES = loadRoles();

// Avatar indices reserved for roles — excluded from the random pool
const ROLE_AVATAR_INDICES = new Set();
for (const [key, role] of Object.entries(ROLES)) {
  if (!role || !role.avatar) continue;
  const idx = AVATAR_FILES.indexOf(role.avatar);
  if (idx === -1) {
    console.warn(`[RoleConfig] Role "${key}": avatar "${role.avatar}" is not in avatars.json (run npm run roles:sync)`);
  } else {
    ROLE_AVATAR_INDICES.add(idx);
  }
}

/** Find the roles.json key for an agent, or null. */
function roleKeyFor({ isSubagent, isTeammate, agentType }) {
  if (isSubagent) {
    if (!agentType) return null;
    if (ROLES[agentType]) return agentType;
    const short = String(agentType).split(':').pop();
    return ROLES[short] ? short : null;
  }
  if (isTeammate) return null;
  return ROLES.lead ? 'lead' : null;
}

/**
 * Resolve role info for an agent.
 * @returns {{ key: string, name: string|null, avatarIndex: number|null } | null}
 */
function resolveRole(agent) {
  const key = roleKeyFor(agent || {});
  if (!key) return null;
  const role = ROLES[key];
  const idx = role.avatar ? AVATAR_FILES.indexOf(role.avatar) : -1;
  return {
    key,
    name: role.name || null,
    avatarIndex: idx === -1 ? null : idx,
  };
}

module.exports = { resolveRole, ROLE_AVATAR_INDICES, ROLES };
