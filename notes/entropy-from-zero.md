---
created: 2026-09-04T04:55:35Z
updated: 2026-09-04T05:27:15Z
---

---
created: 2026-09-04T04:55:35Z
updated: 2026-09-04T05:13:12Z
---

# Entropy from zero

*A short book that starts with hot water and ends with a formula. It assumes nothing.*

## 01 Heat and temperature are two different things

### A level is not an amount

Temperature tells you how hot a thing is. It is a level, and you read it with a thermometer.

Heat is energy that moves from a hot thing to a cold thing. It is an amount, and not a level.

> **Toy example**
>
> You have two cups of water. Both sit at 50 degrees, so both have the same temperature. The first cup holds 100 grams of water, and the second holds 200 grams. The second cup carries twice as much heat energy. The level is the same, and the amount is not.

### A warning about the word "heat"

In everyday speech, heat is all the energy stored in the body (solid, fluid, gas). Physics is stricter. Internal energy is a stock. It sits in the body. The atoms hold it as motion. Heat is a ***flow***. It only exists while energy crosses the boundary. The boundary is the surface you draw around the thing you decided to study. A cup holds 200 joules of internal energy. It sits on the table, and it touches nothing cold. It still holds 200 joules, and no heat exists anywhere. Now put it on ice. Energy *flows*. That moving energy is the heat.

### How do we measure heat and temperature?

We measure heat in joules. If you lift an apple by one metre, then you spend about one joule.

We measure temperature in kelvin. A kelvin is the same size as a Celsius degree, but the scale starts at the coldest point that can exist. A warm room sits at about 300 kelvin.

Do you know how they actually measure heat? They measure a temperature rise instead. Heat equals mass, times specific heat, times that rise. 

> Water: 100 grams
> Temperature rise: 5 kelvin
> Specific heat of water: 4.2 joules per gram per kelvin
> Heat = 100 × 4.2 × 5 = **2100 joules**

Specific heat is a measured property of the material. It tells you how many joules one gram needs for one degree.

## 02 Work is the useful part of energy

### You can always go one way, and not the other

Work is energy that moves something. If an engine lifts a weight, then it did work. We measure work in joules too.

Heat and work are both energy. You can turn work into heat with no loss. You rub your hands together, and all of your work becomes heat. The other direction is the hard one. Nobody can turn a pile of heat fully back into work.

## 03 What Rudolf Clausius was up to

### He was trying to fix steam engines

Rudolf Clausius worked in the 1850s. Steam engines ran the factories of his time. Engineers wanted better ones, so they asked one plain question. How much work can you get out of a given amount of heat?

Every steam engine does three things.

1. It takes heat out of a hot place. We call that place the hot tank.
2. It turns part of that heat into work.
3. It dumps the rest of the heat into a cold place. We call that place the cold tank.

Step 3 annoyed everybody. No engine skips it. Some heat always escapes into the cold tank, and it does no useful job. Clausius wanted to know what forced it to happen.

## 04 The discovery: energy alone does not tell you enough

### Divide by the temperature, and the books close

> **Toy example — the best engine that physics allows**
>
> ```
> Hot tank sits at 400 kelvin.
> Cold tank sits at 300 kelvin.
> The engine takes 800 joules out of the hot tank.
> The engine does 200 joules of work.
> The engine dumps 600 joules into the cold tank.
> ```
>
> The energy balances, because 800 equals 200 plus 600.

The energy balances, and it always does. But that balance does not tell you how big step 3 must be. Energy is perfectly happy with 800 joules in, 800 joules of work, and nothing dumped at all. Real engines never manage that. So something other than energy sets the size of the dumped heat.

Clausius then tried one small trick. He divided each amount of heat by the temperature of its tank.

> **The same toy example, divided**
>
> ```
> Hot side: 800 joules ÷ 400 kelvin = 2
> Cold side: 600 joules ÷ 300 kelvin = 2
> ```
>
> The two numbers match. Energy said nothing about the split, and heat divided by temperature does.

That match is the seed of the whole subject. It forces the dumped heat to be 600 joules, and not zero. Clausius decided that the divided quantity deserved a name.

## 05 What dS = dQ/T means

### Read the letters one by one

- **Q** is heat, measured in joules.
- **T** is temperature, measured in kelvin.
- **S** is the new quantity. Clausius named it entropy in 1865.
- **d** means "a small amount of".

So the line reads like this. A small amount of entropy equals a small amount of heat, divided by the temperature at which it moves.

Why small amounts? The temperature changes while the heat flows. So you cut the flow into thin slices. Each slice moves at one temperature, so each slice gets one clean division. Then you add the slices together.

The units follow from the division. We measure entropy in joules per kelvin.

## 06 Why entropy is a real property

### It depends on where you are, not on how you got there

Think about your height above sea level while you walk in hills. If you finish where you started, then your total change in height is zero. The route makes no difference. Height belongs to the place, and not to the walk.

Entropy passed the same test. Run the perfect engine around one full cycle, add up every small dQ/T, and the total comes out as zero. So entropy is a property of the state that the material is in, in the same way that pressure and volume are.

## 07 The one-way rule

### Break the engine, and the total goes up

Now remove the engine. Let the heat leak straight from the hot tank into the cold tank, and let it do no work.

> **Toy example — a plain leak**
>
> ```
> 600 joules leave the hot tank at 400 kelvin: −1.5
> 600 joules enter the cold tank at 300 kelvin: +2.0
> Total change: +0.5
> ```
>
> The total went up. The same heat is worth more entropy at a low temperature than at a high one.

Now run that backwards. The heat would leave the cold tank and climb into the hot tank on its own. The total would drop by 0.5. Nobody has ever seen that happen.

So Clausius wrote the second law. In a closed system, the total entropy never falls. It rises, or it stays the same.

## 08 The gap that Clausius left

### He knew how to measure it, and not what it was

Clausius could measure entropy with a thermometer and a heat measurement. He could not say what entropy was made of. Heat is motion, and pressure is pushing, but entropy was only a number that behaved well. That gap stayed open for about twenty years.

## 09 Boltzmann fills the gap

### Entropy counts arrangements

Ludwig Boltzmann worked in the 1870s. He made one guess. Entropy counts the arrangements that match what you see.

> **Toy example — four coins**
>
> You throw four coins. Each coin shows heads or tails, so there are 16 arrangements. Now sort them by the number of heads.
>
> ```
> 0 heads: 1 arrangement
> 1 head: 4 arrangements
> 2 heads: 6 arrangements
> 3 heads: 4 arrangements
> 4 heads: 1 arrangement
> ```
>
> You throw the coins again and again. You land on "2 heads" more often than on anything else. That group is the biggest, so it catches the most throws. No force pulls the coins there.

Boltzmann called that count W. So W counts the exact arrangements that fit your rough description.

This explains the one-way rule. Systems drift towards the big groups, because big groups catch more throws. The drift needs no push.

## 10 Why the formula needs a logarithm and a constant

### One fixes the arithmetic, and one fixes the units

Clausius already proved that entropy adds. Put two tanks side by side, and the total is the first plus the second.

Counts do not add. Counts multiply.

> **Toy example — two boxes**
>
> ```
> Box A has 4 arrangements.
> Box B has 8 arrangements.
> Both boxes together have 4 × 8 = 32 arrangements.
> ```
>
> Now take logarithms. ln 4 = 1.386, and ln 8 = 2.079. Those two add to 3.466. And ln 32 = 3.466 as well. The logarithm turns multiplying into adding.

So entropy must be some constant, multiplied by ln W. Clausius already fixed the units as joules per kelvin, so the constant carries those units. Match the counting against the thermometer, and the constant comes out as 0.0000000000000000000000138 joules per kelvin. We call it k, and it is Boltzmann's constant.

**S = k ln W**

Max Planck wrote the formula in this shape in 1900. It now sits on Boltzmann's gravestone.

## 11 Why none of this is made up

### Two people started at opposite ends and met

Clausius never counted anything. He measured heat and temperature in engines, and he built entropy from those readings.

Boltzmann never touched a thermometer for this. He counted arrangements on paper.

Both men produced the same number for the same gas. The thermometer had every chance to disagree with the counting, and it did not. A definition that somebody invents for himself does not predict a reading that he never took.

## 12 What "entropy increases" means

### One sentence, at last

The pile of arrangements that match your description gets bigger. That is all.

Nothing flows out of the box. Nothing new appears inside it. The atoms keep doing what they always did. Only the size of the matching pile grows, because the bigger pile catches more throws.

---

The two definitions are one thing seen from two sides. Use dS = dQ/T when you can measure heat. Use S = k ln W when you can count arrangements.

#physics
#physics

