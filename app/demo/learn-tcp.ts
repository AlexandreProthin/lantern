// Demo subject for the Learn room: "How TCP congestion control works".
// Hand-written in the tutor's format (engineer tone), with fixed ids so links and diffs stay stable.
import { FORMAT } from '../src/core/model';
import type { Author, GraphNode, Generation, Subject, Turn } from '../src/core/model';

const MODEL = 'claude-opus-5-5';
let clock = Date.parse('2026-10-12T18:40:00.000Z');
const at = (minutes = 2) => new Date(clock += minutes * 60_000).toISOString();

const log: Generation[] = [];
function generation(nodeId: string, task: string, output: number): Author {
  const id = `g${String(log.length + 1).padStart(2, '0')}`;
  log.push({ id, nodeId, task, model: MODEL, effort: 'medium', promptVersion: 'learn-2', startedAt: at(1), durationMs: 4000 + output * 12,
    usage: { input: 2400 + log.length * 350, output, thinking: 0, cacheRead: 1800, cacheWrite: 0 }, outcome: 'ok', data: { tone: 'engineer' } });
  return { kind: 'model', model: MODEL, effort: 'medium', generationId: id };
}
const nodes: Record<string, GraphNode> = {};
function node(id: string, parent: string | null, kind: string, title: string, hook = '', createdBy: 'user' | 'model' = 'model'): GraphNode {
  return nodes[id] = { id, parents: parent ? [parent] : [], title, hook, kind, state: 'open', content: '', dialogue: [], createdAt: at(), createdBy };
}
function light(id: string, task: string, content: string, output: number) {
  const n = nodes[id]; n.state = 'lit'; n.content = content.trim(); n.author = generation(id, task, output);
}
const understood = (id: string, by: 'self' | 'demonstrated') => { nodes[id].state = 'understood'; nodes[id].data = { understoodBy: by }; };
const tutor = (id: string, task: string, text: string, output: number): Turn => ({ role: 'model', text: text.trim(), at: at(), author: generation(id, task, output) });
const learner = (text: string): Turn => ({ role: 'user', text, at: at(3), author: { kind: 'user', by: 'Alex' } });

// The subject and its three axes.
node('tcp', null, 'subject', 'How TCP congestion control works', '', 'user');
nodes.tcp.author = { kind: 'user', by: 'Alex' };
light('tcp', 'intro', `
**TCP congestion control** is how every TCP sender decides how fast to send without knowing anything about the network in between. It cannot see the routers or the other flows, so it probes: send a little more, watch for trouble, back off when trouble appears.

Everything rests on one number the sender keeps per connection, the **congestion window** (how much data may be in flight), read against the round-trip time. Get the rules right and thousands of strangers share a bottleneck fairly. Get them wrong and the network collapses, as the early Internet did in 1986, when throughput between some sites fell by a factor of about a thousand.
`, 260);
node('cwnd', 'tcp', 'axis', 'The congestion window', 'The one number that sets how fast a sender goes');
node('loss', 'tcp', 'axis', 'Packet loss as the signal', 'How a sender learns that it went too fast');
node('modern', 'tcp', 'axis', 'Modern algorithms', 'What replaced the classic sawtooth on fast, long paths');

light('cwnd', 'light', `
At any moment the sender may have at most $\\min(\\text{cwnd}, \\text{rwnd})$ bytes unacknowledged. \`rwnd\` is what the **receiver** says it can buffer; \`cwnd\` is the sender's own guess of what the **network** can absorb.

Roughly one window is delivered per round trip, so

$$\\text{throughput} \\approx \\frac{\\text{cwnd}}{\\text{RTT}}$$

A 64 KB window over a 100 ms path caps you near **5 Mbit/s**, whatever the link speed. Congestion control is the set of rules for moving \`cwnd\` up and down.
`, 310);
understood('cwnd', 'self');
node('slow', 'cwnd', 'deeper', 'Slow start', 'Exponential growth until the first sign of trouble');
node('aimd', 'cwnd', 'deeper', 'AIMD: add a little, halve on loss', 'The rule behind the famous sawtooth');
node('probe', 'cwnd', 'exercise', 'Size a window for your own link', 'Bandwidth × RTT for your home connection');

light('slow', 'light', `
Despite the name, slow start grows the window **exponentially**. \`cwnd\` starts small (10 segments on modern stacks) and grows by one segment for every ACK, which doubles it every round trip:

| Round trip | cwnd (segments) |
|---|---|
| 0 | 10 |
| 1 | 20 |
| 2 | 40 |
| 3 | 80 |

It stops at the **slow-start threshold** (\`ssthresh\`) or at the first sign of loss. From there, [AIMD](node:aimd) takes over.
`, 280);
nodes.slow.dialogue.push(
  tutor('slow', 'check', 'A connection starts at 10 segments with `ssthresh` at 64. After how many round trips does it leave slow start, and at what window?', 60),
  learner('During the third round trip: 10, 20, 40, and then it would reach 80, but it stops as soon as it hits 64.'),
  tutor('slow', 'reply', 'Exactly. The switch happens mid-round, the moment `cwnd` reaches `ssthresh`, so the last doubling is cut short at 64.', 70));
understood('slow', 'demonstrated');

light('aimd', 'light', `
Out of slow start, a classic (Reno) sender follows **additive increase, multiplicative decrease**:

- each round trip without loss: $\\text{cwnd} \\leftarrow \\text{cwnd} + 1$ segment
- on a loss: $\\text{cwnd} \\leftarrow \\text{cwnd} / 2$

The result is the **sawtooth**: a slow linear climb, a sharp drop, over and over. A flow at 40 segments that sees a loss drops to 20, then climbs back one segment per round trip.

Why so asymmetric? Probing gently costs little if you were wrong, but a loss means the bottleneck queue is **already full**, so backing off hard drains it fast. It is also what makes flows converge to a fair share: each cut is proportional to the window, so the larger flow gives up more while both climb at the same rate.

With a capacity of $W$ segments the window swings between $W/2$ and $W$, so the link averages about **75%** utilisation.
`, 520);
node('fair', 'aimd', 'deeper', 'Why halving makes flows fair', 'Two flows, one link: watch them converge');
node('sketch', 'aimd', 'exercise', 'Sketch the sawtooth', 'Plot cwnd for 20 round trips with one loss at round 12');
node('tfrc', 'aimd', 'application', 'TCP-friendly rate control', 'How video calls play fair without using TCP');
nodes.aimd.dialogue.push(
  tutor('aimd', 'check', 'A flow is at 40 segments when a loss is detected. Predict `cwnd` for the next five round trips, and say what happens to the bottleneck queue meanwhile.', 70),
  learner('20, 21, 22, 23, 24. The queue empties right after the cut, because we now send half as much as before.'),
  tutor('aimd', 'reply', 'The window is right. On the queue you are close: it drains because the sender now sends **less than the link can carry**, not just less than before. When would halving *not* be enough to drain it?', 90));

light('loss', 'light', `
TCP has no direct view of congestion, so it reads it from **loss**. When a router's queue overflows it drops packets; the sender notices the gap and concludes it was going too fast.

It notices in one of two ways:

1. **Duplicate ACKs**: the receiver keeps acknowledging the last in-order byte. Three duplicates mean one segment is missing while later ones still arrive.
2. **A retransmission timeout**: nothing comes back at all, which is far more serious.

Loss is an imperfect signal. On Wi-Fi a corrupted frame looks just like a full queue, and by the time a queue overflows it has already added delay. Both problems shaped the [modern algorithms](node:modern).
`, 360);
node('fastrx', 'loss', 'deeper', 'Fast retransmit', 'Resend after three duplicate ACKs, without waiting');
node('rto', 'loss', 'deeper', 'Timeouts and the RTO', 'The last resort when ACKs stop coming');
node('ecn', 'loss', 'adjacent', 'ECN: marking instead of dropping', 'Routers flag congestion before they have to drop');

light('rto', 'light', `
The **retransmission timeout** is the sender's last resort: if no ACK arrives in time, it assumes the worst. The timer comes from a smoothed RTT plus four times its variation,

$$\\text{RTO} = \\text{SRTT} + 4 \\cdot \\text{RTTVAR}$$

with a floor of one second in RFC 6298, and it doubles after each expiry. A timeout is treated as severe: \`cwnd\` falls back to one segment and [slow start](node:slow) begins again.
`, 300);
understood('rto', 'self');
nodes.ecn.state = 'dismissed';

light('modern', 'light', `
Reno's sawtooth was designed for paths of a few hundred kbit/s. On a 10 Gbit/s link with a 100 ms RTT the window is about 83,000 segments: after one halving, growing back by one segment per round trip would take **over an hour**.

Two answers dominate today:

- **CUBIC**, the default in Linux since 2006 and in Windows since 2017, grows the window as a function of time since the last loss, so recovery no longer depends on the RTT.
- **BBR**, from Google in 2016, stops treating loss as the signal: it measures the bottleneck bandwidth and the minimum RTT, then paces at that rate.
`, 340);
node('cubic', 'modern', 'deeper', 'CUBIC', 'A cubic curve anchored on the last loss');
node('bbr', 'modern', 'deeper', 'BBR: model the pipe', 'Pace at the measured bandwidth instead of waiting for loss');
node('bloat', 'modern', 'adjacent', 'Bufferbloat', 'Why big router buffers made latency worse');

light('cubic', 'light', `
CUBIC replaces Reno's straight line with a cubic curve anchored on $W_{max}$, the window at the last loss:

$$W(t) = C\\,(t - K)^3 + W_{max}$$

Right after a loss it climbs fast, flattens as it nears $W_{max}$ (where trouble struck last time), then accelerates again to probe for more. Because $t$ is wall-clock time rather than round trips, flows with different RTTs grow at the same pace, which removes Reno's bias against long paths.
`, 330);

export const tcpSubject: Subject = { format: FORMAT, id: 'how-tcp-congestion-control-works-demo', title: nodes.tcp.title, createdAt: nodes.tcp.createdAt,
  rooms: { learn: { model: 'opus', effort: 'medium', data: { tone: 'engineer' }, rootId: 'tcp', focusId: 'aimd', nodes, log } } };

/** What the scripted tutor streams when the GIF lights "Fast retransmit". */
export const fastRetransmitReply = `
**Fast retransmit** repairs a single loss without waiting for the [timeout](node:rto).

When segment 5 is lost but 6, 7 and 8 arrive, the receiver answers each of them with the same ACK: *still waiting for 5*. Three duplicate ACKs are strong evidence of one missing segment on a path that still works, so the sender resends 5 at once.

With **fast recovery**, the window is then halved rather than reset to one segment: the duplicates prove data is still flowing, so a mild [AIMD](node:aimd) cut is enough.

Why three and not one? Packets can be **reordered** in the network, and one or two duplicate ACKs often just mean a segment took a slightly different path.

<options>[{"title": "SACK: say exactly what is missing", "hook": "Selective ACKs list every hole, not just the first one", "kind": "deeper"}, {"title": "Spot duplicate ACKs in a capture", "hook": "Find a fast retransmit in a real Wireshark trace", "kind": "exercise"}, {"title": "Reordering on multipath links", "hook": "When three duplicates are a false alarm", "kind": "adjacent"}]</options>`.trim();
