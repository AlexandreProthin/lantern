// Demo subject for the Learn room: "How TCP congestion control works".
// Hand-written in the tutor's format (engineer tone), with fixed ids so links and diffs stay stable.
import { FORMAT } from '../src/core/model';
import type { Author, GraphNode, Generation, Subject, Turn } from '../src/core/model';
import { options } from '../src/demo/tutor';
import type { LearnScript } from '../src/demo/tutor';

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

/** Prepared answers for the web demo and the README GIF: every open node can be lit, every node tested. */
export const tcpScript: LearnScript = {
  subject: 'How TCP congestion control works',
  light: {
    'Fast retransmit': `
**Fast retransmit** repairs a single loss without waiting for the [timeout](node:rto).

When segment 5 is lost but 6, 7 and 8 arrive, the receiver answers each of them with the same ACK: *still waiting for 5*. Three duplicate ACKs are strong evidence of one missing segment on a path that still works, so the sender resends 5 at once.

With **fast recovery**, the window is then halved rather than reset to one segment: the duplicates prove data is still flowing, so a mild [AIMD](node:aimd) cut is enough.

Why three and not one? Packets can be **reordered** in the network, and one or two duplicate ACKs often just mean a segment took a slightly different path.` + options(
      ['SACK: say exactly what is missing', 'Selective ACKs list every hole, not just the first one', 'deeper'],
      ['Spot duplicate ACKs in a capture', 'Find a fast retransmit in a real Wireshark trace', 'exercise'],
      ['Reordering on multipath links', 'When three duplicates are a false alarm', 'adjacent']),

    'Size a window for your own link': `
Time to put [the congestion window](node:cwnd) to work on a link you know.

1. Find your download speed (a speed test gives it in Mbit/s) and your round-trip time to a server you use often (\`ping\` gives it in ms).
2. Compute the **bandwidth-delay product**, $\\text{BDP} = \\text{bandwidth} \\times \\text{RTT}$, and convert bits to bytes.
3. Divide by a typical segment of 1,460 bytes to get the window in segments.

Then answer two questions: how many round trips of [slow start](node:slow) from 10 segments does it take to reach that window, and how long is that in milliseconds? Try it before asking for a check.` + options(
      ['Receive window scaling', 'Why rwnd needed a multiplier to go past 64 KB', 'deeper'],
      ["Tune a Linux server's buffers", 'What net.ipv4.tcp_rmem actually controls', 'application'],
      ['Long fat networks', 'Satellite and transoceanic links, where the BDP gets huge', 'adjacent']),

    'Why halving makes flows fair': `
Take two flows sharing one bottleneck, starting unequal: flow A at 30 segments, flow B at 10.

- **While there is no loss**, both add one segment per round trip. The *difference* between them stays the same: 20.
- **On a loss**, both halve. A drops by 15, B by 5: the difference halves too, to 10.

Every cycle of climb and cut halves the gap, so the two windows converge on an equal share, whatever they started at. Chiu and Jain showed in 1989 that additive increase with multiplicative decrease is the simple linear rule that converges to both efficiency and fairness.

Two assumptions hide in this: both flows see the loss, and both have the same RTT. With different RTTs, the shorter one climbs faster, a bias that [CUBIC](node:cubic) removes.` + options(
      ['The phase plot of two flows', "Chiu and Jain's diagram: why the path zigzags to the fair line", 'deeper'],
      ['Many connections per app', 'How download managers grab more than their share', 'application'],
      ['Max-min fairness', 'What fair means when flows have different bottlenecks', 'adjacent']),

    'Sketch the sawtooth': `
Draw it by hand before looking anything up:

- Start at **20 segments** at round 0, in congestion avoidance (slow start is over).
- Add one segment per round trip.
- At **round 12**, a loss is detected through duplicate ACKs: halve.
- Continue to round 20.

On your sketch, mark three things: the window just before and just after the loss, how many rounds it takes to climb back, and the **average** window over the 21 rounds. Compare that average with the peak: it is the reason a link under [AIMD](node:aimd) sits near 75% busy.` + options(
      ['Read cwnd on a live Linux socket', 'ss -ti shows cwnd, ssthresh and RTT of every connection', 'application'],
      ['Sawtooth with a timeout instead', 'Redo the plot when round 12 ends in a timeout', 'exercise'],
      ['Throughput formula of Mathis', 'Throughput ≈ MSS / (RTT·√p): the sawtooth in one line', 'deeper']),

    'TCP-friendly rate control': `
Video calls and games often avoid TCP: a retransmitted video frame arrives too late to be useful. But a UDP sender that ignores congestion would crowd out every TCP flow on its link. **TCP-friendly** means using, on average, no more than a TCP flow would under the same conditions.

TFRC (RFC 5348) does it with a formula instead of a window. The receiver reports the loss event rate $p$, the sender measures the RTT, and the rate follows the TCP throughput equation, in its simplest form

$$X \\approx \\frac{s}{\\text{RTT}\\sqrt{2p/3}}$$

with $s$ the packet size. The rate changes **smoothly**, without the sawtooth's sharp halving, which is what a video encoder wants. Real-time media today mostly uses newer schemes in the same spirit, such as GCC in WebRTC, which also reacts to rising delay.` + options(
      ['The full TCP throughput equation', 'Timeouts change the formula when loss gets heavy', 'deeper'],
      ['QUIC: congestion control in user space', "HTTP/3 brings its own congestion control, not the kernel's", 'adjacent'],
      ['Delay-based control in video calls', 'Why calls lower quality before packets are lost', 'application']),

    'BBR: model the pipe': `
BBR (*Bottleneck Bandwidth and Round-trip propagation time*, Google, 2016) stops treating [loss](node:loss) as the signal. It keeps two running estimates:

- **BtlBw**, the highest delivery rate seen recently: what the bottleneck can carry;
- **RTprop**, the lowest RTT seen recently: the path's delay with empty queues.

It then **paces** packets at BtlBw and keeps about $\\text{BtlBw} \\times \\text{RTprop}$ in flight, the point where the pipe is full but no queue builds. Every few round trips it sends 25% faster to see whether more bandwidth appeared, then 25% slower to drain what that probe queued.

The pay-off is large on lossy links, where a random drop no longer halves the rate, and on links with deep buffers, where loss-based senders fill the queue first ([bufferbloat](node:bloat)). The cost: early versions were unfair to loss-based flows in shallow buffers, which later versions work to fix.` + options(
      ['Pacing instead of bursts', 'Spreading packets evenly over the round trip', 'deeper'],
      ['Measure BtlBw yourself', 'Estimate the delivery rate from an ACK trace', 'exercise'],
      ['BBR versus CUBIC on one link', 'Who wins, and why buffer depth decides it', 'application']),

    'Bufferbloat': `
Router and modem buffers grew large because memory got cheap and dropping packets looked bad. With a loss-based sender, a big buffer fills **before** any loss happens, so the queue sits full and every packet waits in it.

An example: a 20 Mbit/s uplink with 1 MB of buffer holds about **400 ms** of queued data. Start a large upload, and your video call, your game and even your DNS lookups wait behind it.

Throughput looks fine on a speed test; latency under load is what suffers. The fixes come from both ends:

- **Active queue management** in routers, such as CoDel and FQ-CoDel, drops or marks packets that have queued too long, not when the buffer is full.
- **Delay-aware senders** such as [BBR](node:bbr) aim to keep the queue empty in the first place.` + options(
      ['Measure latency under load', 'Run a speed test while pinging, and watch the RTT climb', 'exercise'],
      ['CoDel: drop by sojourn time', 'Why time in queue beats queue length as a signal', 'deeper'],
      ['L4S: low latency at scale', 'ECN-based queues that keep delay near zero', 'adjacent']),

    'ECN: marking instead of dropping': `
With **Explicit Congestion Notification** (RFC 3168), a router whose queue is building does not drop the packet: it sets two bits in the IP header to *Congestion Experienced*. The receiver echoes the mark in its ACKs, and the sender reacts as if a packet had been lost, halving its window, without the loss itself.

The gain: no retransmission, no wait for duplicate ACKs or a [timeout](node:rto), and the router can signal **early**, while the queue is still short. It needs both ends and the path to cooperate, which is why it took years to deploy. It is now widely enabled on servers and phones, and it is the basis of L4S.` + options(
      ['Accurate ECN', 'Counting every mark instead of one per round trip', 'deeper'],
      ['Spot ECN bits in a packet', 'Find the ECT and CE codepoints in a capture', 'exercise'],
      ['DCTCP in data centres', 'React to the fraction of marks, not just their presence', 'application'])
  },
  check: {
    'How TCP congestion control works': 'A sender cannot see the routers on its path. What does it use instead to decide it is going too fast, and why is that a late signal?',
    'The congestion window': 'Your link is 100 Mbit/s and the RTT is 50 ms. What window, in bytes, fills it, and what happens to throughput if the RTT doubles but the window does not?',
    'Slow start': 'Why does slow start begin small instead of jumping straight to a large window, given how fast it doubles anyway?',
    'AIMD: add a little, halve on loss': 'Why would *additive* decrease, subtracting a fixed amount on loss, fail to make two flows converge to a fair share?',
    'Packet loss as the signal': 'On a Wi-Fi link, 1% of frames are corrupted by interference while the bottleneck is nowhere near full. What does a loss-based sender do, and what does it cost?',
    'Timeouts and the RTO': 'Why does the RTO formula add four times the RTT *variation* instead of just using the average RTT?',
    'Modern algorithms': "In your own words: why does Reno's one-more-segment-per-round-trip become a problem on a fast, long path?",
    'CUBIC': 'Right after a loss CUBIC grows faster than Reno, then slows down near $W_{max}$. Why is slowing down there a good idea?',
    'Size a window for your own link': 'With your numbers: how many round trips of slow start from 10 segments reach your window, and how long is that in milliseconds?',
    'Why halving makes flows fair': 'Two flows share a link, one with a 10 ms RTT and the other 100 ms. Under Reno, which gets more bandwidth, and why?',
    'Sketch the sawtooth': 'From your sketch: what are the window just before and just after the loss, how many rounds does it take to climb back, and what is the average window?',
    'TCP-friendly rate control': "Why would a video call prefer a smoothly varying rate to TCP's sawtooth, even at the same average throughput?",
    'Fast retransmit': 'Why does a sender wait for three duplicate ACKs before retransmitting, instead of one?',
    'BBR: model the pipe': 'BBR tracks the minimum RTT seen recently. What goes wrong if a queue never drains, so the true minimum is never seen?',
    'Bufferbloat': 'Your upload saturates a modem with a huge buffer. Why does your video call suffer, even though the call itself uses little bandwidth?',
    'ECN: marking instead of dropping': 'A router marks a packet instead of dropping it. What does the sender gain compared with a drop, and what does it still do the same way?'
  },
  answer: {
    'How TCP congestion control works': 'What I was looking for: the sender infers congestion from what comes back, mostly **loss** (duplicate ACKs or a timeout) and, in newer algorithms, **rising RTT**. Both are late: a loss means a queue already overflowed, and a rising RTT means one already built up. That lag is why every algorithm overshoots, then backs off.',
    'The congestion window': 'The window is $100\\ \\text{Mbit/s} \\times 0.05\\ \\text{s} = 5\\ \\text{Mbit}$, about **625 KB**. If the RTT doubles with the same window, throughput **halves**, to about 50 Mbit/s: one window still goes out per round trip, and round trips now last twice as long.',
    'Slow start': 'Because the sender knows nothing about the path yet. Starting small costs only a few round trips, since doubling reaches large windows quickly, while starting large could dump a burst into a queue that cannot hold it and cause losses for everyone on the link. Exponential growth is the compromise: cautious first, fast soon after.',
    'AIMD: add a little, halve on loss': 'With additive increase **and** additive decrease, both flows gain and lose the same amount, so the gap between them never changes: an unfair split stays unfair forever. Multiplicative decrease takes more from the bigger flow, so each loss narrows the gap. [Why halving makes flows fair](node:fair) works through an example.',
    'Packet loss as the signal': 'It reads each corrupted frame as congestion and halves its window, again and again, so it never reaches the capacity of a link that has no queue at all: throughput lost for nothing. Wi-Fi retries at the link layer hide many of these losses, and delay-based senders such as [BBR](node:bbr) avoid the confusion altogether.',
    'Timeouts and the RTO': 'A timer set at the average fires for every packet that is a little slower than average, causing needless retransmissions and a fall back to one segment. Adding a multiple of the variation puts the timer above almost every normal delay, so it fires only when something is really wrong.',
    'Modern algorithms': 'Recovery time grows with the window, and the window grows with bandwidth × RTT. On a 10 Gbit/s, 100 ms path, one halving loses about 41,000 segments, and climbing back one per round trip takes over an hour. Any loss more often than that keeps the link permanently below capacity.',
    'CUBIC': '$W_{max}$ is where the last loss happened, so it is the best guess of where the limit is. Approaching it slowly spends a long time at a high, safe window, close to full use, without triggering the same loss again at once. If no loss comes, the curve accelerates past $W_{max}$ to probe for capacity that may have appeared.',
    'Size a window for your own link': 'It takes $\\lceil \\log_2(W/10) \\rceil$ round trips, with $W$ your window in segments, times your RTT. For example, 100 Mbit/s and 20 ms give a BDP of 250 KB, about 171 segments: **5 round trips**, about **100 ms** to fill the pipe. Small files finish before slow start does, which is why the initial window matters so much for the web.',
    'Why halving makes flows fair': 'The **10 ms** flow. Both add one segment per round trip, but the short one has ten times more round trips per second, so its window climbs ten times faster after each loss. AIMD is only fair between flows with the same RTT; [CUBIC](node:cubic) grows with wall-clock time partly to remove this bias.',
    'Sketch the sawtooth': 'Just before the loss: **32** segments; just after: **16**. Climbing back one per round takes **16 rounds**, so it is not back by round 20, where it reaches 23. The average over the 21 rounds is about **23.5**, roughly 73% of the peak, close to the 75% of a steady [AIMD](node:aimd) sawtooth.',
    'TCP-friendly rate control': 'An encoder picks its quality for a target bitrate. A sudden halving forces a visible quality drop or a stall, then a slow climb back; a smooth rate lets the encoder adapt in small steps. Same average, a much better call.',
    'Fast retransmit': 'One or two duplicates often mean **reordering**: a later packet overtook an earlier one, which then arrives fine. Retransmitting then wastes bandwidth and halves the window for nothing. Three duplicates make a real loss much more likely while still reacting long before the [timeout](node:rto).',
    'BBR: model the pipe': 'BBR would overestimate RTprop, so its in-flight target, BtlBw × RTprop, grows and keeps more data queued, which keeps the RTT high: a self-reinforcing error. That is why BBR regularly drops to a tiny window for a moment (*ProbeRTT*), to drain the queue and see the real propagation delay.',
    'Bufferbloat': "The call's packets join the **same queue** as the upload and wait behind it. With a full buffer that wait can be hundreds of milliseconds, far too long for live audio. The problem is delay, not bandwidth; fair queueing such as FQ-CoDel fixes it by giving the small call flow its own short queue.",
    'ECN: marking instead of dropping': 'It gains no lost data, no retransmission, no wait for duplicate ACKs or a timeout, and an earlier warning. It still **halves its window** as for a loss: ECN changes how congestion is signalled, not how a classic sender reacts to it.'
  }
};

