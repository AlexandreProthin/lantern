window.WELCOMECONTEXT_DATA = {
  "meta": {
    "contract": {
      "contextLimit": "Max characters of the optional context (proposal, not agreed: spec has no such field yet)",
      "titleLimit": "WG-3: titles trimmed and limited to 120 characters",
      "tones / models": "Same pickers as the final welcome design (WG-1, WG-2); default tone curious, default model opus",
      "samples": "Context texts the prototype can fill in: id, label, text",
      "suggestions": "Sets of 3 chips (title, hook) from successive Suggest 3 calls (WG-4); the hook is what a chip could carry as context",
      "states": "Prototype scenarios (WG-12/13)",
      "recents": "3 most recent subjects for the unchanged shelf (copied from the welcome component data, WG-5)",
      "now": "Fixed 'today' for relative dates"
    },
    "cases": [
      "no context (default behaviour: type a title, press Enter)",
      "short one-line context",
      "long multi-line context",
      "context over the limit",
      "context typed but no title",
      "chip chosen with the context already filled",
      "pasted multi-line brief into the title field",
      "first run, CLI not ready",
      "Suggest 3 error and retry"
    ]
  },
  "contextLimit": 500,
  "titleLimit": 120,
  "defaultTone": "curious",
  "defaultModel": "opus",
  "tones": [
    {
      "id": "eli5",
      "label": "ELI5"
    },
    {
      "id": "curious",
      "label": "Curious"
    },
    {
      "id": "student",
      "label": "Student"
    },
    {
      "id": "engineer",
      "label": "Engineer"
    },
    {
      "id": "expert",
      "label": "Expert"
    },
    {
      "id": "custom",
      "label": "Custom"
    }
  ],
  "models": [
    {
      "id": "opus",
      "label": "Opus (default)"
    },
    {
      "id": "sonnet",
      "label": "Sonnet"
    },
    {
      "id": "haiku",
      "label": "Haiku"
    },
    {
      "id": "other",
      "label": "Other id…"
    }
  ],
  "placeholder": "What do you want to learn?",
  "example": "For example, ocean tides, jazz harmony, or how cities grow.",
  "contextPrompts": [
    {
      "id": "from",
      "label": "Start from…",
      "text": "Start from "
    },
    {
      "id": "aim",
      "label": "Aim at…",
      "text": "Aim at "
    },
    {
      "id": "skip",
      "label": "Skip…",
      "text": "I already know "
    }
  ],
  "samples": [
    {
      "id": "none",
      "label": "Empty",
      "text": ""
    },
    {
      "id": "short",
      "label": "Short",
      "text": "Start from the physics of lenses, skip the history."
    },
    {
      "id": "hook",
      "label": "Hook",
      "text": "I already know basic TCP. Aim at how I would debug congestion in production."
    },
    {
      "id": "long",
      "label": "Long (over the limit)",
      "text": "I am a sound designer who knows envelopes and filters but no maths past school level.\nI want the graph to head toward building my own granular synth, so favour hands-on experiments over derivations.\nSkip the history of the Fourier transform. Treat windowing and aliasing as the two hardest nodes and give them room: I keep getting artefacts when I pitch grains down and I never understood why. Come back to this in the first explanation if you can, and keep the first node small enough to read in a minute. When there is a choice between a formula and a picture, show the picture first and the formula second, and tell me when a node is a prerequisite only for the synth and not for the theory. Prefer French examples when you have a choice."
    }
  ],
  "suggestions": [
    [
      {
        "title": "Granular synthesis",
        "hook": "Build sound from thousands of tiny grains, and learn why pitch shifting makes artefacts."
      },
      {
        "title": "How tides work",
        "hook": "From the Moon's pull to the harbour times printed in a tide table."
      },
      {
        "title": "Why cities grow the way they do",
        "hook": "Scaling laws, transport and the shape of a street map."
      }
    ],
    [
      {
        "title": "Jazz harmony",
        "hook": "Why a ii-V-I feels like arriving home, and how players bend it."
      },
      {
        "title": "TCP congestion control",
        "hook": "How two machines agree on a speed nobody told them."
      },
      {
        "title": "Aquarelle",
        "hook": "Pigment, water and paper: why watercolour behaves the way it does."
      }
    ]
  ],
  "cliMessage": "The Claude Code CLI is not ready. Fix it in Settings → Provider.",
  "welcomeLine": "Bring a subject. The tutor lights it one node at a time; you choose where to go next.",
  "states": [
    {
      "id": "normal",
      "label": "Normal"
    },
    {
      "id": "first",
      "label": "First run (no subjects)"
    },
    {
      "id": "cli",
      "label": "CLI not ready"
    }
  ],
  "now": "2026-10-02T10:00:00",
  "recents": [
    {
      "id": "tides",
      "title": "Tides",
      "lastOpened": "2026-10-02T09:14:00",
      "total": 21,
      "understood": 4,
      "thumb": [
        {
          "id": "n1",
          "p": null,
          "s": "understood"
        },
        {
          "id": "n2",
          "p": "n1",
          "s": "understood"
        },
        {
          "id": "n3",
          "p": "n1",
          "s": "understood"
        },
        {
          "id": "n4",
          "p": "n2",
          "s": "understood"
        },
        {
          "id": "n5",
          "p": "n3",
          "s": "lit"
        },
        {
          "id": "n6",
          "p": "n3",
          "s": "lit"
        },
        {
          "id": "n7",
          "p": "n4",
          "s": "lit"
        },
        {
          "id": "n8",
          "p": "n4",
          "s": "lit"
        },
        {
          "id": "n9",
          "p": "n4",
          "s": "lit"
        },
        {
          "id": "n10",
          "p": "n5",
          "s": "lit"
        },
        {
          "id": "n11",
          "p": "n6",
          "s": "lit"
        },
        {
          "id": "n12",
          "p": "n7",
          "s": "lit"
        },
        {
          "id": "n13",
          "p": "n7",
          "s": "open"
        },
        {
          "id": "n14",
          "p": "n7",
          "s": "open"
        },
        {
          "id": "n15",
          "p": "n8",
          "s": "open"
        },
        {
          "id": "n16",
          "p": "n9",
          "s": "open"
        },
        {
          "id": "n17",
          "p": "n9",
          "s": "open"
        },
        {
          "id": "n18",
          "p": "n10",
          "s": "open"
        },
        {
          "id": "n19",
          "p": "n10",
          "s": "open"
        },
        {
          "id": "n20",
          "p": "n10",
          "s": "open"
        },
        {
          "id": "n21",
          "p": "n11",
          "s": "open"
        }
      ],
      "thumbMore": 0
    },
    {
      "id": "tcp",
      "title": "How TCP congestion control works",
      "lastOpened": "2026-10-01T22:40:00",
      "total": 9,
      "understood": 2,
      "thumb": [
        {
          "id": "n1",
          "p": null,
          "s": "understood"
        },
        {
          "id": "n2",
          "p": "n1",
          "s": "understood"
        },
        {
          "id": "n3",
          "p": "n1",
          "s": "lit"
        },
        {
          "id": "n4",
          "p": "n1",
          "s": "lit"
        },
        {
          "id": "n5",
          "p": "n2",
          "s": "lit"
        },
        {
          "id": "n6",
          "p": "n3",
          "s": "open"
        },
        {
          "id": "n7",
          "p": "n4",
          "s": "open"
        },
        {
          "id": "n8",
          "p": "n5",
          "s": "open"
        },
        {
          "id": "n9",
          "p": "n5",
          "s": "open"
        }
      ],
      "thumbMore": 0
    },
    {
      "id": "long",
      "title": "Why do some languages mark evidentiality grammatically while others leave it to context, and what does that tell us about cognition?",
      "lastOpened": "2026-09-29T18:05:00",
      "total": 74,
      "understood": 11,
      "thumb": [
        {
          "id": "n1",
          "p": null,
          "s": "understood"
        },
        {
          "id": "n2",
          "p": "n1",
          "s": "understood"
        },
        {
          "id": "n3",
          "p": "n1",
          "s": "understood"
        },
        {
          "id": "n4",
          "p": "n2",
          "s": "understood"
        },
        {
          "id": "n5",
          "p": "n3",
          "s": "understood"
        },
        {
          "id": "n6",
          "p": "n4",
          "s": "understood"
        },
        {
          "id": "n7",
          "p": "n5",
          "s": "understood"
        },
        {
          "id": "n8",
          "p": "n5",
          "s": "understood"
        },
        {
          "id": "n9",
          "p": "n5",
          "s": "understood"
        },
        {
          "id": "n10",
          "p": "n6",
          "s": "understood"
        },
        {
          "id": "n11",
          "p": "n6",
          "s": "understood"
        },
        {
          "id": "n12",
          "p": "n7",
          "s": "lit"
        },
        {
          "id": "n13",
          "p": "n8",
          "s": "lit"
        },
        {
          "id": "n14",
          "p": "n8",
          "s": "lit"
        },
        {
          "id": "n15",
          "p": "n8",
          "s": "lit"
        },
        {
          "id": "n16",
          "p": "n9",
          "s": "lit"
        },
        {
          "id": "n17",
          "p": "n10",
          "s": "lit"
        },
        {
          "id": "n18",
          "p": "n11",
          "s": "lit"
        },
        {
          "id": "n19",
          "p": "n11",
          "s": "lit"
        },
        {
          "id": "n20",
          "p": "n11",
          "s": "lit"
        },
        {
          "id": "n21",
          "p": "n12",
          "s": "lit"
        },
        {
          "id": "n22",
          "p": "n12",
          "s": "lit"
        },
        {
          "id": "n23",
          "p": "n12",
          "s": "lit"
        },
        {
          "id": "n24",
          "p": "n13",
          "s": "lit"
        },
        {
          "id": "n25",
          "p": "n13",
          "s": "lit"
        },
        {
          "id": "n26",
          "p": "n13",
          "s": "lit"
        },
        {
          "id": "n27",
          "p": "n14",
          "s": "lit"
        },
        {
          "id": "n28",
          "p": "n15",
          "s": "lit"
        },
        {
          "id": "n29",
          "p": "n15",
          "s": "lit"
        },
        {
          "id": "n30",
          "p": "n15",
          "s": "lit"
        },
        {
          "id": "n31",
          "p": "n16",
          "s": "lit"
        },
        {
          "id": "n32",
          "p": "n16",
          "s": "open"
        },
        {
          "id": "n33",
          "p": "n16",
          "s": "open"
        },
        {
          "id": "n34",
          "p": "n17",
          "s": "open"
        },
        {
          "id": "n35",
          "p": "n17",
          "s": "open"
        },
        {
          "id": "n36",
          "p": "n18",
          "s": "open"
        },
        {
          "id": "n37",
          "p": "n19",
          "s": "open"
        },
        {
          "id": "n38",
          "p": "n20",
          "s": "open"
        },
        {
          "id": "n39",
          "p": "n21",
          "s": "open"
        },
        {
          "id": "n40",
          "p": "n21",
          "s": "open"
        },
        {
          "id": "n41",
          "p": "n21",
          "s": "open"
        },
        {
          "id": "n42",
          "p": "n22",
          "s": "open"
        },
        {
          "id": "n43",
          "p": "n23",
          "s": "open"
        },
        {
          "id": "n44",
          "p": "n23",
          "s": "open"
        },
        {
          "id": "n45",
          "p": "n24",
          "s": "open"
        },
        {
          "id": "n46",
          "p": "n24",
          "s": "open"
        },
        {
          "id": "n47",
          "p": "n25",
          "s": "open"
        },
        {
          "id": "n48",
          "p": "n26",
          "s": "open"
        },
        {
          "id": "n49",
          "p": "n26",
          "s": "open"
        },
        {
          "id": "n50",
          "p": "n26",
          "s": "open"
        },
        {
          "id": "n51",
          "p": "n27",
          "s": "open"
        },
        {
          "id": "n52",
          "p": "n28",
          "s": "open"
        },
        {
          "id": "n53",
          "p": "n28",
          "s": "open"
        },
        {
          "id": "n54",
          "p": "n28",
          "s": "open"
        },
        {
          "id": "n55",
          "p": "n29",
          "s": "open"
        },
        {
          "id": "n56",
          "p": "n29",
          "s": "open"
        },
        {
          "id": "n57",
          "p": "n30",
          "s": "open"
        },
        {
          "id": "n58",
          "p": "n30",
          "s": "open"
        },
        {
          "id": "n59",
          "p": "n30",
          "s": "open"
        },
        {
          "id": "n60",
          "p": "n31",
          "s": "open"
        }
      ],
      "thumbMore": 14
    }
  ],
  "subjectCount": 14
};
