window.CHOOSE_COMPARE_DATA = {
 "meta": {
  "about": "Compare content for the choose-compare wireframes. Placeholder products on purpose (Printer A…); not real facts. Every proposal reads the same scenarios.",
  "scenario": "id, label, subject, products (columns: id, name, state shortlisted | chosen, filling: being researched), criteria (rows: id, name, state must | nice | irrelevant, why, filling), cells keyed \"productId:criterionId\", web (Use the web on/off, CR-44), modelDate (web off), progress (tool events of a running research call, IP-20), started, candidates (not shortlisted), status (subject status)",
  "cell": "value (null when none), status: ok | filling | none (no source found) | disagree (sources differ, CR-42 rule 7) | edited (the user's value; room keeps its own in room, CR-51 / DM-16); kind: price for an indication at a date (CR-41); note; user {value, date, note}; sources []",
  "source": "kind: spec (manufacturer, rule 1) | measured (independent measurement or review, rule 2) | opinion (community, rule 3) | sponsored (affiliate or sponsored, rules 4-5: shown, never a basis) | model (model knowledge when the web is off, CR-44); name; date read (CR-41); value it gave; note",
  "research": "a research call takes 40-65 s (choose-web-tools decision); progress comes from the stream's tool events"
 },
 "scenarios": [
  {
   "id": "three",
   "label": "Three products",
   "subject": "3D printer",
   "products": [
    {
     "id": "a",
     "name": "Printer A",
     "state": "shortlisted"
    },
    {
     "id": "b",
     "name": "Printer B",
     "state": "shortlisted"
    },
    {
     "id": "d",
     "name": "Printer D",
     "state": "shortlisted"
    }
   ],
   "criteria": [
    {
     "id": "quality",
     "name": "Print quality at small scale",
     "state": "must",
     "why": "figurines need fine detail"
    },
    {
     "id": "noise",
     "name": "Noise",
     "state": "must",
     "why": "it stands in a bedroom"
    },
    {
     "id": "setup",
     "name": "Ease of setup",
     "state": "must",
     "why": "as little tuning as possible"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "about 500 €, 600 € at most"
    },
    {
     "id": "volume",
     "name": "Build volume",
     "state": "nice",
     "why": "10 cm figurines fit any printer"
    },
    {
     "id": "speed",
     "name": "Print speed",
     "state": "nice",
     "why": "nice, not needed"
    },
    {
     "id": "enclosure",
     "name": "Enclosure",
     "state": "irrelevant",
     "why": "PLA only"
    },
    {
     "id": "colour",
     "name": "Multi-colour",
     "state": "irrelevant",
     "why": "single colour is fine"
    }
   ],
   "cells": {
    "a:quality": {
     "value": "0.05 mm layers; very fine detail on miniatures",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "excellent detail at 0.08 mm"
      }
     ]
    },
    "b:quality": {
     "value": "Good; slight ringing at speed",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "good, ringing above 200 mm/s"
      },
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "fine for figurines once tuned"
      }
     ]
    },
    "d:quality": {
     "value": "0.05 mm layers; detail close to A",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "very good detail"
      }
     ]
    },
    "a:noise": {
     "value": "48–54 dB",
     "status": "disagree",
     "note": "The manufacturer says 48 dB; an independent measurement found 54 dB in normal mode.",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "48 dB (silent mode)"
      },
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "54 dB (normal mode)"
      },
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"quiet with the door closed\""
      }
     ]
    },
    "b:noise": {
     "value": "52 dB",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "52 dB"
      }
     ]
    },
    "d:noise": {
     "value": null,
     "status": "none",
     "note": "No measurement found; the manufacturer gives no figure.",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"louder than my old printer\""
      }
     ]
    },
    "a:setup": {
     "value": "About 15 min, auto-calibration",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer quick-start guide",
       "date": "2026-10-12",
       "value": "15 min"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "ready in 20 min, no tuning"
      }
     ]
    },
    "b:setup": {
     "value": "About 1 h; manual bed levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "1–2 h for a first-timer"
      },
      {
       "kind": "sponsored",
       "name": "\"Best printers of 2026\" affiliate list",
       "date": "2026-10-12",
       "value": "\"set up in minutes\"",
       "note": "affiliate: not used"
      }
     ]
    },
    "d:setup": {
     "value": "About 30 min, auto-levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "auto-levelling"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "30 min"
      }
     ]
    },
    "a:price": {
     "value": "549 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "549 €"
      }
     ]
    },
    "b:price": {
     "value": "299–329 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "329 €"
      },
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-13",
       "value": "299 € (promotion)"
      }
     ]
    },
    "d:price": {
     "value": "449 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-12",
       "value": "449 €"
      }
     ]
    },
    "a:volume": {
     "value": "256 × 256 × 256 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:volume": {
     "value": "220 × 220 × 250 mm",
     "status": "edited",
     "user": {
      "value": "220 × 220 × 250 mm",
      "date": "2026-10-13",
      "note": "checked on the box in the shop"
     },
     "room": "235 × 235 × 250 mm",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "235 × 235 × 250 mm"
      }
     ]
    },
    "d:volume": {
     "value": "220 × 220 × 220 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:speed": {
     "value": "500 mm/s max., about 250 mm/s in practice for good quality on small parts; slower for the finest figurines",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "500 mm/s"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "250 mm/s keeps quality"
      }
     ]
    },
    "b:speed": {
     "value": "250 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:speed": {
     "value": "400 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:enclosure": {
     "value": "Yes",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:enclosure": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:enclosure": {
     "value": "No (accessory)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:colour": {
     "value": "With add-on (4 colours)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    }
   },
   "web": true
  },
  {
   "id": "one",
   "label": "One product",
   "subject": "3D printer",
   "products": [
    {
     "id": "a",
     "name": "Printer A",
     "state": "shortlisted"
    }
   ],
   "criteria": [
    {
     "id": "quality",
     "name": "Print quality at small scale",
     "state": "must",
     "why": "figurines need fine detail"
    },
    {
     "id": "noise",
     "name": "Noise",
     "state": "must",
     "why": "it stands in a bedroom"
    },
    {
     "id": "setup",
     "name": "Ease of setup",
     "state": "must",
     "why": "as little tuning as possible"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "about 500 €, 600 € at most"
    },
    {
     "id": "volume",
     "name": "Build volume",
     "state": "nice",
     "why": "10 cm figurines fit any printer"
    },
    {
     "id": "speed",
     "name": "Print speed",
     "state": "nice",
     "why": "nice, not needed"
    },
    {
     "id": "enclosure",
     "name": "Enclosure",
     "state": "irrelevant",
     "why": "PLA only"
    },
    {
     "id": "colour",
     "name": "Multi-colour",
     "state": "irrelevant",
     "why": "single colour is fine"
    }
   ],
   "cells": {
    "a:quality": {
     "value": "0.05 mm layers; very fine detail on miniatures",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "excellent detail at 0.08 mm"
      }
     ]
    },
    "a:noise": {
     "value": "48–54 dB",
     "status": "disagree",
     "note": "The manufacturer says 48 dB; an independent measurement found 54 dB in normal mode.",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "48 dB (silent mode)"
      },
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "54 dB (normal mode)"
      },
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"quiet with the door closed\""
      }
     ]
    },
    "a:setup": {
     "value": "About 15 min, auto-calibration",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer quick-start guide",
       "date": "2026-10-12",
       "value": "15 min"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "ready in 20 min, no tuning"
      }
     ]
    },
    "a:price": {
     "value": "549 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "549 €"
      }
     ]
    },
    "a:volume": {
     "value": "256 × 256 × 256 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:speed": {
     "value": "500 mm/s max., about 250 mm/s in practice for good quality on small parts; slower for the finest figurines",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "500 mm/s"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "250 mm/s keeps quality"
      }
     ]
    },
    "a:enclosure": {
     "value": "Yes",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:colour": {
     "value": "With add-on (4 colours)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    }
   },
   "web": true,
   "candidates": [
    "Printer B",
    "Printer D"
   ]
  },
  {
   "id": "five",
   "label": "Five products",
   "subject": "3D printer",
   "products": [
    {
     "id": "a",
     "name": "Printer A",
     "state": "shortlisted"
    },
    {
     "id": "b",
     "name": "Printer B",
     "state": "shortlisted"
    },
    {
     "id": "d",
     "name": "Printer D",
     "state": "shortlisted"
    },
    {
     "id": "e",
     "name": "Printer E",
     "state": "shortlisted"
    },
    {
     "id": "f",
     "name": "Printer F with a long model name (2026 edition)",
     "state": "shortlisted"
    }
   ],
   "criteria": [
    {
     "id": "quality",
     "name": "Print quality at small scale",
     "state": "must",
     "why": "figurines need fine detail"
    },
    {
     "id": "noise",
     "name": "Noise",
     "state": "must",
     "why": "it stands in a bedroom"
    },
    {
     "id": "setup",
     "name": "Ease of setup",
     "state": "must",
     "why": "as little tuning as possible"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "about 500 €, 600 € at most"
    },
    {
     "id": "volume",
     "name": "Build volume",
     "state": "nice",
     "why": "10 cm figurines fit any printer"
    },
    {
     "id": "speed",
     "name": "Print speed",
     "state": "nice",
     "why": "nice, not needed"
    },
    {
     "id": "enclosure",
     "name": "Enclosure",
     "state": "irrelevant",
     "why": "PLA only"
    },
    {
     "id": "colour",
     "name": "Multi-colour",
     "state": "irrelevant",
     "why": "single colour is fine"
    }
   ],
   "cells": {
    "a:quality": {
     "value": "0.05 mm layers; very fine detail on miniatures",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "excellent detail at 0.08 mm"
      }
     ]
    },
    "b:quality": {
     "value": "Good; slight ringing at speed",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "good, ringing above 200 mm/s"
      },
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "fine for figurines once tuned"
      }
     ]
    },
    "d:quality": {
     "value": "0.05 mm layers; detail close to A",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "very good detail"
      }
     ]
    },
    "a:noise": {
     "value": "48–54 dB",
     "status": "disagree",
     "note": "The manufacturer says 48 dB; an independent measurement found 54 dB in normal mode.",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "48 dB (silent mode)"
      },
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "54 dB (normal mode)"
      },
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"quiet with the door closed\""
      }
     ]
    },
    "b:noise": {
     "value": "52 dB",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "52 dB"
      }
     ]
    },
    "d:noise": {
     "value": null,
     "status": "none",
     "note": "No measurement found; the manufacturer gives no figure.",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"louder than my old printer\""
      }
     ]
    },
    "a:setup": {
     "value": "About 15 min, auto-calibration",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer quick-start guide",
       "date": "2026-10-12",
       "value": "15 min"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "ready in 20 min, no tuning"
      }
     ]
    },
    "b:setup": {
     "value": "About 1 h; manual bed levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "1–2 h for a first-timer"
      },
      {
       "kind": "sponsored",
       "name": "\"Best printers of 2026\" affiliate list",
       "date": "2026-10-12",
       "value": "\"set up in minutes\"",
       "note": "affiliate: not used"
      }
     ]
    },
    "d:setup": {
     "value": "About 30 min, auto-levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "auto-levelling"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "30 min"
      }
     ]
    },
    "a:price": {
     "value": "549 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "549 €"
      }
     ]
    },
    "b:price": {
     "value": "299–329 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "329 €"
      },
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-13",
       "value": "299 € (promotion)"
      }
     ]
    },
    "d:price": {
     "value": "449 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-12",
       "value": "449 €"
      }
     ]
    },
    "a:volume": {
     "value": "256 × 256 × 256 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:volume": {
     "value": "220 × 220 × 250 mm",
     "status": "edited",
     "user": {
      "value": "220 × 220 × 250 mm",
      "date": "2026-10-13",
      "note": "checked on the box in the shop"
     },
     "room": "235 × 235 × 250 mm",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "235 × 235 × 250 mm"
      }
     ]
    },
    "d:volume": {
     "value": "220 × 220 × 220 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:speed": {
     "value": "500 mm/s max., about 250 mm/s in practice for good quality on small parts; slower for the finest figurines",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "500 mm/s"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "250 mm/s keeps quality"
      }
     ]
    },
    "b:speed": {
     "value": "250 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:speed": {
     "value": "400 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:enclosure": {
     "value": "Yes",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:enclosure": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:enclosure": {
     "value": "No (accessory)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:colour": {
     "value": "With add-on (4 colours)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "e:quality": {
     "value": "Good",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "Good"
      }
     ]
    },
    "e:noise": {
     "value": "50 dB",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "50 dB"
      }
     ]
    },
    "e:setup": {
     "value": "About 20 min",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "About 20 min"
      }
     ]
    },
    "e:price": {
     "value": "399 €",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "399 €"
      }
     ],
     "kind": "price"
    },
    "e:volume": {
     "value": "250 × 210 × 210 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "250 × 210 × 210 mm"
      }
     ]
    },
    "e:speed": {
     "value": "300 mm/s",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "300 mm/s"
      }
     ]
    },
    "e:enclosure": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "No"
      }
     ]
    },
    "e:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "No"
      }
     ]
    },
    "f:quality": {
     "value": "Very good",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "Very good"
      }
     ]
    },
    "f:noise": {
     "value": "47 dB",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "47 dB"
      }
     ]
    },
    "f:setup": {
     "value": "About 10 min",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "About 10 min"
      }
     ]
    },
    "f:price": {
     "value": "619 €",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "619 €"
      }
     ],
     "kind": "price",
     "note": "Above your 600 € limit."
    },
    "f:volume": {
     "value": "300 × 300 × 300 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "300 × 300 × 300 mm"
      }
     ]
    },
    "f:speed": {
     "value": "600 mm/s",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "600 mm/s"
      }
     ]
    },
    "f:enclosure": {
     "value": "Yes",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "Yes"
      }
     ]
    },
    "f:colour": {
     "value": "Yes (8 colours)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "Yes (8 colours)"
      }
     ]
    }
   },
   "web": true
  },
  {
   "id": "filling",
   "label": "Being filled",
   "subject": "3D printer",
   "products": [
    {
     "id": "a",
     "name": "Printer A",
     "state": "shortlisted"
    },
    {
     "id": "b",
     "name": "Printer B",
     "state": "shortlisted"
    },
    {
     "id": "d",
     "name": "Printer D",
     "state": "shortlisted"
    },
    {
     "id": "e",
     "name": "Printer E",
     "state": "shortlisted",
     "filling": true
    }
   ],
   "criteria": [
    {
     "id": "quality",
     "name": "Print quality at small scale",
     "state": "must",
     "why": "figurines need fine detail"
    },
    {
     "id": "noise",
     "name": "Noise",
     "state": "must",
     "why": "it stands in a bedroom"
    },
    {
     "id": "setup",
     "name": "Ease of setup",
     "state": "must",
     "why": "as little tuning as possible"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "about 500 €, 600 € at most"
    },
    {
     "id": "volume",
     "name": "Build volume",
     "state": "nice",
     "why": "10 cm figurines fit any printer"
    },
    {
     "id": "speed",
     "name": "Print speed",
     "state": "nice",
     "why": "nice, not needed"
    },
    {
     "id": "spares",
     "name": "Spare parts availability",
     "state": "must",
     "why": "you keep things for years",
     "filling": true
    },
    {
     "id": "enclosure",
     "name": "Enclosure",
     "state": "irrelevant",
     "why": "PLA only"
    },
    {
     "id": "colour",
     "name": "Multi-colour",
     "state": "irrelevant",
     "why": "single colour is fine"
    }
   ],
   "cells": {
    "a:quality": {
     "value": "0.05 mm layers; very fine detail on miniatures",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "excellent detail at 0.08 mm"
      }
     ]
    },
    "b:quality": {
     "value": "Good; slight ringing at speed",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, test-print series",
       "date": "2026-10-12",
       "value": "good, ringing above 200 mm/s"
      },
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "fine for figurines once tuned"
      }
     ]
    },
    "d:quality": {
     "value": "0.05 mm layers; detail close to A",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "min. layer 0.05 mm"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "very good detail"
      }
     ]
    },
    "a:noise": {
     "value": "48–54 dB",
     "status": "disagree",
     "note": "The manufacturer says 48 dB; an independent measurement found 54 dB in normal mode.",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "48 dB (silent mode)"
      },
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "54 dB (normal mode)"
      },
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"quiet with the door closed\""
      }
     ]
    },
    "b:noise": {
     "value": "52 dB",
     "status": "ok",
     "sources": [
      {
       "kind": "measured",
       "name": "Independent review, measured at 1 m",
       "date": "2026-10-12",
       "value": "52 dB"
      }
     ]
    },
    "d:noise": {
     "value": null,
     "status": "none",
     "note": "No measurement found; the manufacturer gives no figure.",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum",
       "date": "2026-10-12",
       "value": "\"louder than my old printer\""
      }
     ]
    },
    "a:setup": {
     "value": "About 15 min, auto-calibration",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer quick-start guide",
       "date": "2026-10-12",
       "value": "15 min"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "ready in 20 min, no tuning"
      }
     ]
    },
    "b:setup": {
     "value": "About 1 h; manual bed levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "opinion",
       "name": "User forum, experience reports",
       "date": "2026-10-12",
       "value": "1–2 h for a first-timer"
      },
      {
       "kind": "sponsored",
       "name": "\"Best printers of 2026\" affiliate list",
       "date": "2026-10-12",
       "value": "\"set up in minutes\"",
       "note": "affiliate: not used"
      }
     ]
    },
    "d:setup": {
     "value": "About 30 min, auto-levelling",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "auto-levelling"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "30 min"
      }
     ]
    },
    "a:price": {
     "value": "549 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "549 €"
      }
     ]
    },
    "b:price": {
     "value": "299–329 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer shop (FR)",
       "date": "2026-10-12",
       "value": "329 €"
      },
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-13",
       "value": "299 € (promotion)"
      }
     ]
    },
    "d:price": {
     "value": "449 €",
     "status": "ok",
     "kind": "price",
     "sources": [
      {
       "kind": "spec",
       "name": "Retailer (FR)",
       "date": "2026-10-12",
       "value": "449 €"
      }
     ]
    },
    "a:volume": {
     "value": "256 × 256 × 256 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:volume": {
     "value": "220 × 220 × 250 mm",
     "status": "edited",
     "user": {
      "value": "220 × 220 × 250 mm",
      "date": "2026-10-13",
      "note": "checked on the box in the shop"
     },
     "room": "235 × 235 × 250 mm",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "235 × 235 × 250 mm"
      }
     ]
    },
    "d:volume": {
     "value": "220 × 220 × 220 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:speed": {
     "value": "500 mm/s max., about 250 mm/s in practice for good quality on small parts; slower for the finest figurines",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12",
       "value": "500 mm/s"
      },
      {
       "kind": "measured",
       "name": "Independent review",
       "date": "2026-10-12",
       "value": "250 mm/s keeps quality"
      }
     ]
    },
    "b:speed": {
     "value": "250 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:speed": {
     "value": "400 mm/s max.",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:enclosure": {
     "value": "Yes",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:enclosure": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:enclosure": {
     "value": "No (accessory)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "a:colour": {
     "value": "With add-on (4 colours)",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "b:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "d:colour": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-12"
      }
     ]
    },
    "e:quality": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:noise": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:setup": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:price": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:volume": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:speed": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:spares": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:enclosure": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "e:colour": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "a:spares": {
     "value": "Official parts shop, nozzles and belts in stock",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer parts shop",
       "date": "2026-10-14"
      }
     ]
    },
    "b:spares": {
     "value": null,
     "status": "filling",
     "sources": []
    },
    "d:spares": {
     "value": null,
     "status": "filling",
     "sources": []
    }
   },
   "web": true,
   "progress": [
    "Searching: Printer E specifications",
    "Reading the manufacturer page",
    "Searching: Printer E noise measurement",
    "Reading an independent review",
    "Searching: spare parts for Printer B"
   ],
   "started": "42 s ago"
  },
  {
   "id": "chosen",
   "label": "Chosen",
   "subject": "Road bike for commuting",
   "products": [
    {
     "id": "ba",
     "name": "Bike A",
     "state": "chosen"
    },
    {
     "id": "bb",
     "name": "Bike B",
     "state": "shortlisted"
    }
   ],
   "criteria": [
    {
     "id": "mounts",
     "name": "Mudguard and rack mounts",
     "state": "must",
     "why": "all-year commuting"
    },
    {
     "id": "tyres",
     "name": "Tyre clearance",
     "state": "must",
     "why": "some gravel"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "1 200 €"
    },
    {
     "id": "weight",
     "name": "Weight",
     "state": "nice",
     "why": "stairs at the office"
    },
    {
     "id": "shift",
     "name": "Electronic shifting",
     "state": "irrelevant",
     "why": "not at this budget"
    }
   ],
   "cells": {
    "ba:mounts": {
     "value": "Full mudguards and rack",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "Full mudguards and rack"
      }
     ]
    },
    "ba:tyres": {
     "value": "40 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "40 mm"
      }
     ]
    },
    "ba:price": {
     "value": "1 149 €",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "1 149 €"
      }
     ],
     "kind": "price"
    },
    "ba:weight": {
     "value": "10.4–10.7 kg",
     "status": "disagree",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "10.4 kg"
      },
      {
       "kind": "measured",
       "name": "Independent review, weighed size M",
       "date": "2026-10-06",
       "value": "10.7 kg"
      }
     ],
     "note": "Claimed 10.4 kg; weighed at 10.7 kg in size M."
    },
    "ba:shift": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "No"
      }
     ]
    },
    "bb:mounts": {
     "value": "Mudguards only",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "Mudguards only"
      }
     ]
    },
    "bb:tyres": {
     "value": "35 mm",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "35 mm"
      }
     ]
    },
    "bb:price": {
     "value": "999 €",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "999 €"
      }
     ],
     "kind": "price"
    },
    "bb:weight": {
     "value": "9.2 kg",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "9.2 kg"
      }
     ]
    },
    "bb:shift": {
     "value": "No",
     "status": "ok",
     "sources": [
      {
       "kind": "spec",
       "name": "Manufacturer specifications",
       "date": "2026-10-06",
       "value": "No"
      }
     ]
    }
   },
   "web": true,
   "status": "decided"
  },
  {
   "id": "weboff",
   "label": "Web off",
   "subject": "Noise-cancelling headphones",
   "products": [
    {
     "id": "ha",
     "name": "Headphones A",
     "state": "shortlisted"
    },
    {
     "id": "hb",
     "name": "Headphones B",
     "state": "shortlisted"
    }
   ],
   "criteria": [
    {
     "id": "anc",
     "name": "Noise cancelling on engine drone",
     "state": "must",
     "why": "flights"
    },
    {
     "id": "glasses",
     "name": "Comfort with glasses",
     "state": "must",
     "why": "thick frames"
    },
    {
     "id": "mic",
     "name": "Microphone in noise",
     "state": "must",
     "why": "Teams calls"
    },
    {
     "id": "price",
     "name": "Price",
     "state": "must",
     "why": "under 350 €"
    },
    {
     "id": "battery",
     "name": "Battery life",
     "state": "nice",
     "why": "14-hour flight"
    }
   ],
   "cells": {
    "ha:anc": {
     "value": "Among the best on low drone",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "ha:glasses": {
     "value": "Light clamp; good with glasses",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "ha:mic": {
     "value": "Average in noise",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "ha:price": {
     "value": "About 330 € (model knowledge)",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ],
     "kind": "price"
    },
    "ha:battery": {
     "value": "30 h",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "hb:anc": {
     "value": "Very good",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "hb:glasses": {
     "value": "Firm clamp; pressure on frames",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "hb:mic": {
     "value": "Good",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    },
    "hb:price": {
     "value": "About 280 € (model knowledge)",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ],
     "kind": "price"
    },
    "hb:battery": {
     "value": "40 h",
     "status": "ok",
     "sources": [
      {
       "kind": "model",
       "name": "Model knowledge",
       "date": "to 2026-01"
      }
     ]
    }
   },
   "web": false,
   "modelDate": "2026-01"
  }
 ]
};
