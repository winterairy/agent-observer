/**
 * observe.mjs 통합(T1-7, 설계 14절). 설치된 .claude/team/observe/observe.mjs를 그대로 경로로 실행해
 * SessionStart → PreToolUse → PostToolUse(usage 포함) → Stop을 보낸 뒤 조회 API로 확인한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { OBSERVE, apiLogin, requireFile, runNode, senderEnv, tmpDir } from './helpers';

test('observe.mjs로 보낸 세션이 완료 상태로 조회되고 토큰 수는 없다. 틀린 토큰이면 세션이 생기지 않는다', async ({ request }) => {
  requireFile(OBSERVE);
  await apiLogin(request);
  const W = tmpDir('obs-it-');
  const transcript = path.join(W, 'transcript.jsonl');
  fs.writeFileSync(
    transcript,
    JSON.stringify({
      type: 'assistant',
      message: { id: 'm1', model: 'claude-haiku-5-5', usage: { input_tokens: 6, output_tokens: 398, cache_creation_input_tokens: 12285, cache_read_input_tokens: 100229 } },
    }) + '\n',
  );
  const sid = `it-${Math.random().toString(36).slice(2)}`;
  const base = { session_id: sid, cwd: W, transcript_path: transcript };
  const env = senderEnv(W);
  const steps = [
    { ...base, hook_event_name: 'SessionStart', source: 'startup', model: 'claude-haiku-5-5' },
    { ...base, hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '/etc/hosts' } },
    { ...base, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: '/etc/hosts' }, tool_response: { ok: true } },
    { ...base, hook_event_name: 'Stop' },
  ];
  for (const s of steps) {
    const r = await runNode(OBSERVE, JSON.stringify(s), env, W);
    expect(r.code).toBe(0);
  }
  const project = path.basename(W);
  let list: { sessions: { key: string; status: string; branch: string | null }[] } = { sessions: [] };
  await expect
    .poll(async () => {
      list = await (await request.get(`/api/sessions?project=${encodeURIComponent(project)}`)).json();
      return list.sessions.map((x) => x.status);
    })
    .toEqual(['done']);
  expect(list.sessions[0].branch).toBeNull();
  const detailRes = await request.get(`/api/sessions/${list.sessions[0].key}`);
  const detailText = await detailRes.text();
  const detail = JSON.parse(detailText);
  expect(detail.agents[0]).toMatchObject({ role: 'lead', status: 'done' });
  expect(detail.session.model).toBe('claude-haiku-5-5');
  const listText = JSON.stringify(list);
  for (const t of [listText, detailText]) {
    for (const bad of ['usage', 'cost', 'cache_read', '398', '100229', '/etc/hosts']) expect(t).not.toContain(bad);
  }

  // 틀린 토큰
  const sid2 = `it-bad-${Math.random().toString(36).slice(2)}`;
  const r = await runNode(
    OBSERVE,
    JSON.stringify({ ...base, session_id: sid2, hook_event_name: 'SessionStart', source: 'startup' }),
    senderEnv(W, { AGENT_OBSERVER_TOKEN: 'wrong-token-0123456789' }),
    W,
  );
  expect(r.code).toBe(0);
  await new Promise((res) => setTimeout(res, 1000));
  const after = await (await request.get(`/api/sessions?project=${encodeURIComponent(project)}&ended=all`)).json();
  expect(after.sessions.map((x: { sessionId: string }) => x.sessionId)).toEqual([sid]);
});
