// Prepared answers for the web demo's live new subject, "Blender 3D" (curious tone): the intro,
// its three axes and their nine children. Deeper nodes get the demo's honest fallback.
import { options } from '../src/demo/tutor';
import type { LearnScript } from '../src/demo/tutor';

export const blenderScript: LearnScript = {
  subject: 'Blender 3D',
  intro: `
**Blender** is a free, open-source program for making 3D graphics: modelling, sculpting, animation, rendering, visual effects, video editing and even 2D animation, all in one application. It runs on Windows, macOS and Linux, and it is developed by the non-profit Blender Foundation in Amsterdam, with a small paid team and a very large community.

What makes it remarkable is the combination: a complete professional pipeline that costs nothing and belongs to no company, used for everything from hobby projects to an Oscar-winning feature film.` + options(
    ['The whole pipeline in one program', 'From a cube to a finished film without leaving Blender', 'axis'],
    ['How it became so popular', 'From a rescued product to one of the most used 3D tools', 'axis'],
    ['Why it is a special piece of software', 'Free for good, built in public, shaped by its users', 'axis']),

  light: {
    'The whole pipeline in one program': `
A 3D image or film passes through a chain of stages; big studios often use a different specialised tool for each. Blender covers them all:

| Stage | In Blender |
|---|---|
| **Modelling** | polygons, curves, and modifiers that stack without destroying your work |
| **Sculpting** | shaping millions of polygons like digital clay |
| **Shading** | node-based materials, and painting straight onto the model |
| **Animation** | skeletons, keyframes, physics and simulations |
| **Rendering** | Cycles (physically based) and EEVEE (real time) |
| **Finishing** | a node compositor and a built-in video editor |

It even does 2D animation with **Grease Pencil**. Because one file holds every stage, a change to a model flows straight through to the final render, with no exporting between programs.` + options(
      ['Cycles and EEVEE, two renderers', 'Physically accurate versus real time, and when to use which', 'deeper'],
      ['Model your first object', 'A coffee mug from a cylinder, step by step', 'exercise'],
      ['Grease Pencil: drawing in 3D', '2D animation inside a 3D scene', 'adjacent']),

    'How it became so popular': `
Blender began in 1994 as the in-house tool of NeoGeo, a Dutch animation studio, written by **Ton Roosendaal**. The company later created to sell it went bankrupt in 2002. Ton then asked the users to buy the code back: the *Free Blender* campaign raised **€100,000 in about seven weeks**, and Blender became open source in October 2002.

Its rise came in steps:

- **Open movies** from 2006 (*Elephants Dream*, *Big Buck Bunny*, *Sintel*): short films made to push Blender forward, with every production file published.
- **Blender 2.80 in 2019**: a rebuilt, far friendlier interface and the real-time EEVEE renderer. Many date its mainstream breakthrough to this release.
- **Industry backing**: companies such as Epic Games, NVIDIA, AMD and Ubisoft now fund developers through the Blender Development Fund.

In 2025, ***Flow***, an independent film made in Blender, won the Oscar for Best Animated Feature.` + options(
      ['The Free Blender campaign', "How users bought a program's freedom in 2002", 'deeper'],
      ['Blender 2.80, the turning point', 'What changed in 2019, and why it mattered so much', 'deeper'],
      ['Flow: an Oscar made in Blender', 'How a small team made a feature film with free software', 'application']),

    'Why it is a special piece of software': `
Most professional 3D tools are sold by large companies on subscription. Blender differs on almost every point:

- **Free, for good.** Its GPL licence means nobody can take it away or start charging for it, and what you make with it is entirely yours.
- **Built in public.** Development is open: anyone can follow it, test it or contribute.
- **Funded by its users.** Individual donors and companies pay a core team through the Development Fund, so no single customer steers it.
- **Made by people who use it.** The Blender Studio makes films and assets with each new feature, so the tools are tested on real productions.
- **Extensible.** Almost everything can be scripted in **Python**, and a large ecosystem of add-ons covers specialised needs.

The result is rare: a tool of professional scope whose direction is set by its community rather than by a sales strategy.` + options(
      ['The GPL and what it guarantees', 'Why your work is yours, and the program stays free', 'deeper'],
      ['Geometry Nodes', 'Building models with rules instead of by hand', 'deeper'],
      ['Write a tiny add-on in Python', 'A script that builds a spiral of cubes', 'exercise']),

    'Cycles and EEVEE, two renderers': `
Blender ships two render engines that read the same materials and lights:

- **Cycles** is a *path tracer*: it follows rays of light as they bounce around the scene, which gives physically accurate shadows, reflections and indirect light, at the cost of time (seconds to minutes per frame on a good graphics card).
- **EEVEE** is a *real-time* engine, built on the same techniques as video games. It approximates light, so a frame takes a fraction of a second.

A common workflow: design and animate with EEVEE for instant feedback, then render the final frames in Cycles when accuracy matters. Some projects never leave EEVEE: the film *Flow* was rendered with it.` + options(
      ['Denoising: fewer samples, clean image', 'How AI denoisers cut render times', 'deeper'],
      ['Render one scene in both engines', 'Compare the same shot side by side', 'exercise'],
      ['Real-time rendering in games', 'What EEVEE shares with game engines', 'adjacent']),

    'Model your first object': `
Make a coffee mug: it uses the core moves of modelling.

1. Delete the default cube (\`X\`), then add a cylinder (\`Shift+A\` → *Mesh* → *Cylinder*).
2. In Edit Mode (\`Tab\`), select the top face, **inset** it (\`I\`), then **extrude** it down (\`E\`) to hollow the mug.
3. Add a handle: a torus scaled and placed against the side, or a few faces extruded outward and bent round.
4. Back in Object Mode, add a **Subdivision Surface** modifier (\`Ctrl+2\`) and choose *Shade Smooth*.

Try it, then ask me to check you: what happens to the mug's rim with the modifier on, and how would you keep it sharp?` + options(
      ['Supporting edge loops', 'Keep edges crisp under subdivision', 'deeper'],
      ['Light and render your mug', 'Three lights and a first Cycles render', 'exercise'],
      ['Hard-surface versus organic modelling', 'Machines and characters need different habits', 'adjacent']),

    'Grease Pencil: drawing in 3D': `
Grease Pencil turns Blender into a 2D animation tool. You draw **strokes**, as with a pen on a tablet, but each stroke lives in the 3D scene: you can move the camera around a drawing, light it, and mix it with 3D objects.

Animators use it for storyboards, for whole 2D films drawn frame by frame, and for hand-drawn effects on top of 3D shots. It has layers, *onion skinning* (seeing the neighbouring frames faintly while you draw) and modifiers that can, for example, add a wobble to every line.` + options(
      ['Onion skinning and timing', 'Seeing the frames around the one you draw', 'deeper'],
      ['Storyboard a short scene', 'Six panels for a ten-second shot', 'exercise'],
      ['2D and 3D in one shot', 'Hand-drawn lines over a 3D camera move', 'application']),

    'The Free Blender campaign': `
In 2002 Not a Number (NaN), the company selling Blender, closed, and its investors owned the code. Ton Roosendaal set up the non-profit **Blender Foundation** and agreed a price with them: €100,000 to release the source as open source. The community campaign reached it in about seven weeks, and on 13 October 2002 Blender was published under the GNU GPL.

It was one of the first times users collectively bought a commercial program to set it free. The lesson shaped Blender's model ever since: the users fund the work, and the code belongs to everyone.` + options(
      ['The Blender Foundation today', 'Who runs Blender, and how decisions are made', 'deeper'],
      ['Open-source business models', 'How free software pays its developers', 'adjacent'],
      ["Compare two projects' funding", 'Blender and one other open project, side by side', 'exercise']),

    'Blender 2.80, the turning point': `
Before 2019 Blender had a reputation: powerful but strange. Selection was on the right mouse button, the interface followed its own conventions, and many newcomers gave up in the first hour.

**Blender 2.80** (July 2019) changed that: left-click selection by default, a redesigned interface with a *workspace* for each task, the **EEVEE** real-time renderer, and Grease Pencil as a full 2D animation system. Tutorials, schools and studios followed, and so did funding: Epic Games granted $1.2 million that year.

It is a good example of how usability, not features alone, decides whether powerful software gets adopted.` + options(
      ['Workspaces: a layout per task', 'Why modelling and animation get different screens', 'deeper'],
      ['The donut tutorial phenomenon', 'How one video series taught a generation of artists', 'adjacent'],
      ['Tour the default workspaces', 'Visit each tab and name what it is for', 'exercise']),

    'Flow: an Oscar made in Blender': `
*Flow* (2024), directed by Gints Zilbalodis, follows a cat through a flooded world without a single line of dialogue. It was made by a small team in Latvia, France and Belgium on a budget of about €3.5 million, a tiny fraction of a major studio film, and it was rendered with Blender's real-time EEVEE engine.

In March 2025 it won the Academy Award for Best Animated Feature, ahead of big-studio films. For many, it marked the moment free software stopped being *the alternative* and became simply a professional tool.` + options(
      ['Rendering a feature in real time', 'Why EEVEE made a small budget possible', 'deeper'],
      ['Other films made with Blender', "From the open movies to Netflix's Next Gen", 'adjacent'],
      ['Plan a ten-second shot', 'A camera, a light and one moving object', 'exercise']),

    'The GPL and what it guarantees': `
Blender is licensed under the **GNU General Public License**. It grants four freedoms: to run the program for any purpose, to study and change its code, to share it, and to share your changed versions. The one condition: if you distribute a modified Blender, you must share its source under the same licence.

Two consequences matter most:

- **What you create is yours.** Models, images and films made with Blender are not covered by the GPL; you can sell them freely.
- **It cannot be closed again.** No company can buy Blender and turn it into a paid product.

Add-ons that use Blender's Python API are treated as part of the program and must be GPL too, a frequent surprise for people who sell them.` + options(
      ['Selling add-ons under the GPL', 'How marketplaces work when the code must stay open', 'application'],
      ['Copyleft versus permissive licences', 'The GPL against MIT and Apache, in practice', 'adjacent'],
      ['Read a licence in five minutes', "Find the four freedoms in the GPL's text", 'exercise']),

    'Geometry Nodes': `
Geometry Nodes builds geometry with **rules** instead of by hand. You connect nodes in a graph: take a surface, scatter points on it, put a rock on each point, vary size and rotation at random, and delete the ones under water.

Change one input, the density or the shape of the terrain, and the whole result updates. This *procedural* approach lets artists build forests, cities or motion graphics that would be impossible to place by hand, and share them as reusable tools.` + options(
      ['Scatter objects on a surface', 'A meadow of flowers from a handful of nodes', 'exercise'],
      ['Fields: data flowing through nodes', 'How each point gets its own value', 'deeper'],
      ['Procedural tools in games', 'Houdini, game engines and the procedural wave', 'adjacent']),

    'Write a tiny add-on in Python': `
Blender's whole interface is built on its Python API, so a few lines can add a tool. Open the **Scripting** workspace and run this in the text editor:

\`\`\`python
import bpy, math
for i in range(10):
    a = i * 0.6
    bpy.ops.mesh.primitive_cube_add(size=0.4, location=(math.cos(a) * 2, math.sin(a) * 2, i * 0.3))
\`\`\`

Ten cubes appear in a rising spiral. Your exercise: turn it into an **operator**, a class with \`bl_idname\`, \`bl_label\` and an \`execute\` method, register it, and add it to the *Add* menu. Then ask me to check what your \`execute\` returns, and why.` + options(
      ['Operators, panels and menus', "The three building blocks of Blender's interface", 'deeper'],
      ['Drive animation with Python', 'Keyframes from data: a bar chart that grows', 'application'],
      ['Blender from the command line', 'Render a file without opening the interface', 'adjacent'])
  },

  check: {
    'Blender 3D': 'In a sentence or two: what would a small studio gain, and what might it lose, by making Blender its only 3D tool?',
    'The whole pipeline in one program': 'A client asks for a change to a model the day before delivery. Why does having every stage in one file help?',
    'How it became so popular': "Of the steps in Blender's rise, which do you think mattered most for newcomers, and why?",
    'Why it is a special piece of software': 'A large company offers to buy Blender and make it paid. Using what you just read, explain why that cannot happen.',
    'Cycles and EEVEE, two renderers': 'You must deliver a 300-frame product animation tomorrow. Which engine do you start with, and what would make you switch?',
    'Model your first object': "With the Subdivision Surface modifier on, what happens to the mug's rim, and how do you keep it sharp?",
    'Grease Pencil: drawing in 3D': 'What can a Grease Pencil drawing do that a drawing in a 2D-only program cannot?',
    'The Free Blender campaign': 'Why did the campaign need to raise money at all, if the developers wanted to release the code?',
    'Blender 2.80, the turning point': 'Apart from new features such as EEVEE, 2.80 mostly changed how Blender *feels*. Why could that alone change adoption so much?',
    'Flow: an Oscar made in Blender': "Why did rendering with EEVEE matter for a film with Flow's budget?",
    'The GPL and what it guarantees': 'You make a 3D model in Blender and sell it, and you write an add-on and sell it too. Which of the two must be shared under the GPL?',
    'Geometry Nodes': 'Apart from saving time, why build a forest with Geometry Nodes rather than placing trees by hand?',
    'Write a tiny add-on in Python': "What must your operator's `execute` method return, and why does Blender need it?"
  },

  answer: {
    'Blender 3D': 'What I was looking for: it **gains** no licence costs, one program and one file for the whole pipeline, and a tool nobody can withdraw. It **may lose** some very specialised strengths of other tools, and hiring can favour artists trained elsewhere. That is why many studios mix Blender with other software.',
    'The whole pipeline in one program': 'Because the change flows through: materials, rig, animation and render settings all refer to the same object, so you edit the model once and render again. With separate programs you would export it, import it again at every stage, and repair whatever broke on the way.',
    'How it became so popular': 'Most people point to **2.80**: before it, the unusual interface stopped many beginners; after it, Blender felt familiar and tutorials exploded. But it built on the other steps: open source made it free to try, and the open movies had already shown it could make professional work. A good answer names one step and says what it unlocked.',
    'Why it is a special piece of software': 'The code is under the **GPL** and written by many contributors, not owned by one seller: anyone may keep sharing the current version for free. A buyer could at most fund or copy it, and the community would carry on with the free one. And the Foundation is a non-profit: there is no company to buy.',
    'Cycles and EEVEE, two renderers': 'Start with **EEVEE**: 300 frames render in minutes, and you can adjust quickly. Switch to **Cycles** if the shot depends on accurate light, such as glass, complex reflections or soft indirect light that EEVEE fakes poorly, and only if the render time fits before tomorrow.',
    'Model your first object': 'Subdivision rounds every edge, so the rim turns soft and blobby. To keep it sharp, add **supporting edge loops** close to the rim (`Ctrl+R`) or give the edge a crease (`Shift+E`): the closer the loops, the tighter the edge.',
    'Grease Pencil: drawing in 3D': 'It lives in **3D space**: the camera can move around it with correct perspective, it can be lit and placed in front of or behind 3D objects, and one drawing can be seen from several angles. In a 2D program, a camera move means drawing again.',
    'The Free Blender campaign': 'The code was not theirs to give: after the company closed, it belonged to the investors as an asset. The €100,000 bought those rights, so Blender could legally be released under the GPL.',
    'Blender 2.80, the turning point': 'Because the barrier was **usability**, not capability: right-click selection and unfamiliar layouts drove newcomers away in their first hour. Lowering it brought tutorials, schools and studios, which then brought funding and more features. Adoption follows the first hour of use more than the feature list.',
    'Flow: an Oscar made in Blender': 'Render time is money: path-traced frames can take minutes or hours each on a render farm. A real-time engine renders a frame in seconds on ordinary computers, so a small team could see final images while working and change them without paying for a large farm.',
    'The GPL and what it guarantees': 'Only the **add-on**: it uses Blender\'s Python API, so it counts as part of the program and must be GPL when you distribute it (you can still charge for it, but buyers may share the code). The model is your own work; the GPL does not reach it.',
    'Geometry Nodes': 'Because it stays **editable**: change the terrain, the density or the mix of species and the whole forest updates. Hand-placed trees are frozen decisions; a node setup is a reusable rule you can adjust, animate, or apply to another scene.',
    'Write a tiny add-on in Python': "A set such as `{'FINISHED'}` (or `{'CANCELLED'}`). Blender uses it to know whether the operation succeeded, so it can record an **undo** step and report the result; returning nothing raises an error."
  }
};
