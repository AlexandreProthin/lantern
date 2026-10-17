import { describe, expect, it } from 'vitest';
import { cloneJson, normalizeTitle } from '../core/model';
import { newLearnSubject } from '../rooms/learn/rules';
import { taskPrompt } from '../rooms/learn/prompts';
import { parseReply } from '../rooms/learn/protocol';
import { tcpScript, tcpSubject } from '../../demo/learn-tcp';
import { blenderScript } from '../../demo/learn-blender';
import { demoNewSubject } from './prefill';
import { prepared, scriptedReply, ScriptedTutor } from './tutor';

const scripts = [tcpScript, blenderScript].map(prepared);
const tcp = cloneJson(tcpSubject).rooms.learn;
const titleOf = (id: string) => tcp.nodes[id].title;

describe('demo scripts', () => {
  it('end every intro and light with three valid, unique options', () => {
    for (const script of scripts) {
      const seen = new Set(script === scripts[0] ? Object.values(tcp.nodes).map(n => normalizeTitle(n.title)) : []);
      for (const raw of [...(script.intro ? [script.intro] : []), ...Object.values(script.light)]) {
        const reply = parseReply(raw, raw === script.intro ? 'intro' : 'light');
        expect(reply.optionsValid && reply.options.length).toBe(3);
        expect(reply.text).not.toBe('');
        for (const o of reply.options) { expect(seen.has(normalizeTitle(o.title))).toBe(false); seen.add(normalizeTitle(o.title)); }
      }
    }
  });
  it('can light every open node of the TCP subject and test every node', () => {
    for (const n of Object.values(tcp.nodes)) {
      if (n.state === 'open' || n.state === 'dismissed') expect(scripts[0].light[normalizeTitle(n.title)], n.title).toBeTruthy();
      expect(scripts[0].check[normalizeTitle(n.title)], n.title).toBeTruthy();
      expect(scripts[0].answer[normalizeTitle(n.title)], n.title).toBeTruthy();
    }
  });
  it('answers but never grades, so no node is marked understood by the demo', () => {
    for (const s of scripts) for (const a of Object.values(s.answer)) expect(a).not.toMatch(/<understood/);
  });
});

describe('scripted tutor', () => {
  it('routes the real prompts to the prepared text', () => {
    const light = taskPrompt(tcp, 'light', 'fastrx').prompt;
    expect(scriptedReply(scripts, light)).toBe(scripts[0].light[normalizeTitle(titleOf('fastrx'))]);
    expect(scriptedReply(scripts, taskPrompt(tcp, 'check', 'aimd').prompt)).toBe(scripts[0].check[normalizeTitle(titleOf('aimd'))]);
    const blender = newLearnSubject(demoNewSubject.title, { tone: 'curious', model: 'opus', effort: 'medium', direction: demoNewSubject.direction }).rooms.learn;
    expect(scriptedReply(scripts, taskPrompt(blender, 'intro', blender.rootId).prompt)).toBe(scripts[1].intro);
  });
  it('falls back honestly for anything not prepared', () => {
    const other = newLearnSubject('Ocean tides').rooms.learn;
    expect(scriptedReply(scripts, taskPrompt(other, 'intro', other.rootId).prompt)).toContain('no live tutor');
  });
  it('waits, streams the whole text and can be cancelled', async () => {
    const tutor = new ScriptedTutor(scripts, () => 5, 0), chunks: string[] = [];
    const done = await tutor.stream({ requestId: 'r', system: '', prompt: taskPrompt(tcp, 'check', 'cubic').prompt, cancel: new AbortController().signal }, c => chunks.push(c));
    expect(chunks.join('')).toBe(done.text);
    const stop = new AbortController(); stop.abort();
    await expect(tutor.stream({ requestId: 'r', system: '', prompt: '', cancel: stop.signal }, () => {})).rejects.toThrow('cancelled');
  });
});
