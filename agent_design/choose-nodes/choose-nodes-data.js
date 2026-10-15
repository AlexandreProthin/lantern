window.CHOOSE_NODES_DATA = {
  "meta": {
    "about": "Shared content for the choose-nodes rounds: one Choose subject graph (3D printer) and the canonical state sheet. Products are placeholders (Printer A…), as on the board. Every proposal reads this file through choose-nodes-data.js and draws it with assets/node-kit.js (layout, selection, panels); only the node glyph, the state treatment and the legend differ.",
    "contract": {
      "id": "unique, stable",
      "parentId": "parent node id; null for the subject",
      "kind": "subject | concept | need | criterion | family | product | own (CR-20)",
      "title": "the node's label; may be long; never empty except where noted",
      "state": "per kind (CR-21): concept, family, own: open | lit; need: open | answered; criterion: open | must | nice | irrelevant; product: candidate | shortlisted | chosen | rejected; any kind but subject: dismissed",
      "status": "subject only: exploring | decided | bought (CR-24); the subject has no learning state",
      "answer": "need only, when answered: the user's answer",
      "why": "criterion only: why it matters for this user",
      "fact": "product only: one key fact",
      "reason": "product only, when rejected: why (required)",
      "dismissedFrom": "dismissed only: the state it was dismissed from (open, or candidate for a product; LR-54: from open only)"
    },
    "selection": "Selection is independent of state, as in Learn: it never changes the data.",
    "cases": [
      "one chosen product (p1), so the subject is decided (CR-22, CR-24)",
      "rejected products with short (p3) and long (p7) reasons",
      "a dismissed node of four kinds (c5 concept, n5 need, f3 family, p8 product)",
      "many products in one family (f1: 8 products in every product state)",
      "long labels on a concept (c4), a criterion (k6), a product (p6) and a family (f2)",
      "a need still open (n3) next to answered needs, a criterion still open (k5), a family still open (f4)",
      "open and dismissed nodes are always leaves (LR-39); answered, ranked and lit nodes can have children",
      "a user's own node lit (o1) and open (o2)",
      "deep branch: subject > concept > concept (c2 > c3)"
    ]
  },
  "subject": "3D printer",
  "nodes": [
    {
      "id": "s",
      "parentId": null,
      "kind": "subject",
      "title": "3D printer",
      "status": "decided"
    },
    {
      "id": "c1",
      "parentId": "s",
      "kind": "concept",
      "title": "FDM or resin?",
      "state": "lit"
    },
    {
      "id": "c2",
      "parentId": "s",
      "kind": "concept",
      "title": "What is a heated bed?",
      "state": "lit"
    },
    {
      "id": "c3",
      "parentId": "c2",
      "kind": "concept",
      "title": "Speed vs. print quality",
      "state": "open"
    },
    {
      "id": "c4",
      "parentId": "c1",
      "kind": "concept",
      "title": "Why a direct-drive extruder matters more than the hot-end temperature when you print flexible filaments such as TPU",
      "state": "open"
    },
    {
      "id": "c5",
      "parentId": "c1",
      "kind": "concept",
      "title": "Multi-material printing",
      "state": "dismissed",
      "dismissedFrom": "open"
    },
    {
      "id": "n1",
      "parentId": "s",
      "kind": "need",
      "title": "How much can you spend?",
      "state": "answered",
      "answer": "about 500 €, 600 € at most"
    },
    {
      "id": "n2",
      "parentId": "s",
      "kind": "need",
      "title": "What will you print?",
      "state": "answered",
      "answer": "small detailed figurines, mostly under 10 cm"
    },
    {
      "id": "n4",
      "parentId": "s",
      "kind": "need",
      "title": "Where will it stand?",
      "state": "answered",
      "answer": "in the kids' room"
    },
    {
      "id": "n3",
      "parentId": "n2",
      "kind": "need",
      "title": "Will you print ABS?",
      "state": "open"
    },
    {
      "id": "n5",
      "parentId": "s",
      "kind": "need",
      "title": "Do you need Wi-Fi?",
      "state": "dismissed",
      "dismissedFrom": "open"
    },
    {
      "id": "k1",
      "parentId": "n2",
      "kind": "criterion",
      "title": "Print quality at small scale",
      "state": "must",
      "why": "figurines need fine detail"
    },
    {
      "id": "k2",
      "parentId": "n4",
      "kind": "criterion",
      "title": "Noise",
      "state": "must",
      "why": "it stands in a bedroom"
    },
    {
      "id": "k3",
      "parentId": "n2",
      "kind": "criterion",
      "title": "Build volume",
      "state": "nice",
      "why": "10 cm figurines fit any printer"
    },
    {
      "id": "k4",
      "parentId": "s",
      "kind": "criterion",
      "title": "Multi-colour",
      "state": "irrelevant",
      "why": "you said single colour is fine"
    },
    {
      "id": "k5",
      "parentId": "s",
      "kind": "criterion",
      "title": "Enclosure",
      "state": "open",
      "why": "matters only if you print ABS"
    },
    {
      "id": "k6",
      "parentId": "s",
      "kind": "criterion",
      "title": "Time from unboxing to the first successful print without manual bed levelling",
      "state": "nice",
      "why": "first printer, little patience for tuning"
    },
    {
      "id": "f1",
      "parentId": "s",
      "kind": "family",
      "title": "Enclosed CoreXY around 600 €",
      "state": "lit"
    },
    {
      "id": "f2",
      "parentId": "s",
      "kind": "family",
      "title": "Open bed-slingers under 350 € with automatic levelling and a direct-drive head",
      "state": "lit"
    },
    {
      "id": "f4",
      "parentId": "s",
      "kind": "family",
      "title": "Printers with a camera",
      "state": "open"
    },
    {
      "id": "f3",
      "parentId": "s",
      "kind": "family",
      "title": "Resin printers",
      "state": "dismissed",
      "dismissedFrom": "open"
    },
    {
      "id": "p1",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer A",
      "state": "chosen",
      "fact": "enclosed CoreXY, 549 €, 42 dB"
    },
    {
      "id": "p2",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer B",
      "state": "shortlisted",
      "fact": "enclosed CoreXY, 599 €"
    },
    {
      "id": "p3",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer C",
      "state": "rejected",
      "fact": "enclosed CoreXY, 489 €",
      "reason": "too loud for a bedroom (58 dB measured)"
    },
    {
      "id": "p4",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer D",
      "state": "candidate",
      "fact": "enclosed CoreXY, 579 €"
    },
    {
      "id": "p5",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer E",
      "state": "candidate",
      "fact": "enclosed CoreXY, 615 €"
    },
    {
      "id": "p6",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer F Pro Max Enclosed Dual-Extruder Edition (2026 refresh)",
      "state": "shortlisted",
      "fact": "two heads, 598 €"
    },
    {
      "id": "p7",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer G",
      "state": "rejected",
      "fact": "enclosed CoreXY, 699 €",
      "reason": "over budget once the enclosure fan kit and the filament dryer it needs are included (742 € in total), and the vendor's noise figure has no source"
    },
    {
      "id": "p8",
      "parentId": "f1",
      "kind": "product",
      "title": "Printer H",
      "state": "dismissed",
      "dismissedFrom": "candidate",
      "fact": "kit, 449 €"
    },
    {
      "id": "p9",
      "parentId": "f2",
      "kind": "product",
      "title": "Printer J",
      "state": "candidate",
      "fact": "bed-slinger, 329 €"
    },
    {
      "id": "p10",
      "parentId": "f2",
      "kind": "product",
      "title": "Printer K",
      "state": "shortlisted",
      "fact": "bed-slinger, 299 €"
    },
    {
      "id": "o1",
      "parentId": "s",
      "kind": "own",
      "title": "The printer at the library",
      "state": "lit"
    },
    {
      "id": "o2",
      "parentId": "o1",
      "kind": "own",
      "title": "Can I bring my own filament there?",
      "state": "open"
    }
  ],
  "stateSheet": [
    {
      "kind": "subject",
      "states": [
        "exploring",
        "decided",
        "bought"
      ],
      "note": "a status, not a learning state; never dismissed"
    },
    {
      "kind": "concept",
      "states": [
        "open",
        "lit",
        "dismissed"
      ],
      "note": "as in Learn, no understood"
    },
    {
      "kind": "need",
      "states": [
        "open",
        "answered",
        "dismissed"
      ]
    },
    {
      "kind": "criterion",
      "states": [
        "open",
        "must",
        "nice",
        "irrelevant",
        "dismissed"
      ],
      "note": "changeable at any time (CR-23)"
    },
    {
      "kind": "family",
      "states": [
        "open",
        "lit",
        "dismissed"
      ]
    },
    {
      "kind": "product",
      "states": [
        "candidate",
        "shortlisted",
        "chosen",
        "rejected",
        "dismissed"
      ],
      "note": "at most one chosen (CR-22); rejected carries a reason"
    },
    {
      "kind": "own",
      "states": [
        "open",
        "lit",
        "dismissed"
      ],
      "note": "added by the user, as in Learn"
    }
  ],
  "sampleTitles": {
    "subject": "3D printer",
    "concept": "What is a heated bed?",
    "need": "What will you print?",
    "criterion": "Noise",
    "family": "Enclosed CoreXY",
    "product": "Printer A",
    "own": "My own question"
  }
};
