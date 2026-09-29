# Issues

Known defects, limitations, and open questions — the things a newcomer would
otherwise rediscover the hard way. An issue concept records what is wrong, how
to reproduce or recognise it, and what is known about the cause.

Use `type: Issue`. Fixed issues become `status: deprecated` with a line saying
what fixed them; that record is why the next person does not reintroduce it.

* [Subject on-disk format](subject-on-disk-format.md) - OKF bundle or custom format?
* [Context does not scale with subject size](context-scaling.md) - The whole map is sent on every turn.
* [LLM latency](llm-latency.md) - About 3 s overhead per call, about 25 s to light a node.
