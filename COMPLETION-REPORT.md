# Completion report — The Zodiac Standard

A finished browser tactics game based on the six local PS1 guides. The playable file is `the-zodiac-standard.html`. It opens from disk with no sibling asset requests. The commercial title is not used.

Built 2026-09-25 by Grok 4.7.

## Coverage

`COVERAGE.md` lists 763 rows and all 763 resolve (100%). That includes:

- The prologue at Orbonne and every story battle from [2.1a] Gariland through [2.4v] Airship Graveyard II, each with an objective, a map, enemies, and a scene the player enters before the fight.
- Every job in the jobs guide: the Squire and Chemist trees, the mixed jobs through Mime, the special jobs, and the monster classes.
- The extracted item list, with a shop, poach, steal, battle, or Move-Find source the player can reach.
- Poach rows, ten Deep Dungeon floors (dark maps, a hidden exit, Zodiac learned by a surviving Summoner), the secret-character chain through Cloud and Byblos, rare battles, shops, tavern recruitment, propositions, and random encounters.
- The systems named in guide sections I–XV and XVII–XIX. Section XVI (FFT Online) is out of scope.

Story battles, jobs, the Deep Dungeon, the secret chain, and those systems are inside the resolved set, not in any slack.

## What the guides’ own advice changed

The walkthrough spends its opening pages on complaints that show up in play: people lose track of turn order, trap themselves in a single save, and cannot see why a job is locked. Those notes are treated as player feedback.

- The battle ribbon is a turn-order forecast on the Charge Time clock.
- A move can be undone until Act or Wait commits it.
- Animation speed has four steps, including a fast one.
- Three save slots, and a warning before a battle that cannot be left until it is won.
- The job list prints the level requirements from the jobs guide.
- Deployment uses the party on that battle’s map, with move range and a height check before the step.

Wiegraf at Riovanes Castle I is still a one-on-one fight that can be lost.

## Rules

The battle screen calls the same core the tests import. Speed ticks raise CT. Move and Act spend 100, Move or Act spends 80, Wait spends 60, and the result is capped at 60. A tile above Jump cannot be entered. The side-attack and Flare numbers from the mechanics guide (45% and 63%) and the Lich example (251, then 126 and 77) are the oracles. Charge +1 waits out its CTR. Reactions trigger on a Brave roll and only when that reaction is equipped. Zero HP starts the death count; a revive clears it; the end of the count leaves a crystal or a chest. Brave 9 is a chicken and Brave 10 is not. Killing the objective wins. A required guest’s permanent death loses. After the player only waits, an adjacent enemy takes a legal action and changes HP.

Knight stays locked until Squire job level 2. Mime uses the printed prerequisites. Dancer rejects a male and Bard rejects a female. A learned ability survives a job change and does not fire until its command is equipped. A dagger raises a Squire’s attack and is refused by a Knight. Poaching a Goblin yields Potion or Hi-Potion. January 1 is Capricorn. A save slot restores story position, JP, abilities, inventory, and Brave/Faith.

## Additions, not guide facts

These are original to this edition. They are not printed in the guides.

- The title, the two opening cadets’ default names (Cadet and Apprentice), and every spoken line. Characters, relationships, and outcomes follow the guides — Teta dies at Zeakden, Gafgarion betrays and later falls, Queklain and the other Lucavi are fought, Delita takes the crown, Ramza and Alma leave the official history — but the sentences are new. They are not quotations of the script or the walkthrough.
- Five proposition errands. The walkthrough describes the system and says it never finished the list.
- Field maps for battles whose walkthrough section did not include a height grid. Gariland through Fovoham Plains use the printed grids. The other fields are new layouts with the guide’s objective and cast.
- The dusk pixel direction and the music. Four concepts were drawn first (dusk standard, rain council, zodiac glass, sandstone court). The game uses the dusk palette: indigo stone, torch gold, dried-blood crimson, limestone. Character sprites follow that direction. Tones are generated in the game, not taken from a commercial sheet or soundtrack.
- Math Skill hits units whose level is divisible by 4 or whose CT is divisible by 5, on the real clock, instead of the full calculator menu. A few rare reactions share the Brave check and a counter or potion effect rather than every unique animation in the mechanics guide.
- Story enemies are capped at Ramza's level, or one level higher when the guide marks them as the objective. They never go above the printed level. A joined unique who arrives at a high level does not drag the rest of the army up with them.
- Allies and guests receive 24 extra HP as a field dressing. Enemy totals stay on the printed formula.
- Enemy beasts in a fight use one third of the compendium's 10× beast HP. `surfaceStat` itself is unchanged, and an unprepared Ramza still loses the Riovanes duel.
- Before a story battle the company spends gil on the best stable shop weapon each fighter can equip, and restocks hi-potions and phoenix downs. Empty hands get a level-appropriate issued weapon. Flails, axes, and bags are left for the player to choose. Enemy loadouts use the same weapon ceiling.
- Any unit may drink a carried potion, or use a phoenix down on an adjacent fallen ally. Throwing items at other targets still requires the Chemist command.
- Isolated tiles on a height map get a one-step ramp so Jump 3 can cross. Printed heights stay where they were already connected.
- A protect battle is won by defeating the enemies before the guest becomes a crystal.
- A story victory restores companions who crystallized during that fight. A defeat still removes a generic who became a crystal. Ramza is never removed.

## How to play

Open `the-zodiac-standard.html`. New Game asks for a name and a birthday, then Orbonne. Arrows, WASD, the on-screen pad, a click, or a gamepad move the same cursor. Act, Wait, Undo, Auto, and Menu are the same commands on every device. Act can Attack, Drink a carried potion, or use a Phoenix Down on an adjacent fallen unit. Options hold mute, volume, a fullscreen and landscape lock, effect quality, and animation speed.
