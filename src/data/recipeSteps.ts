// Step-by-step cooking instructions, keyed by recipe id. Each step is one action the
// cook can do with their hands busy; `timer` is in minutes (null = no timer needed).
// Recipe 1 keeps its steps inline in recipes.ts.

export type StepInput = { title: string; desc: string; tip: string; timer: number | null };

const s = (title: string, desc: string, tip: string, timer: number | null = null): StepInput => ({ title, desc, tip, timer });

export const RECIPE_STEPS: Record<number, StepInput[]> = {
  // Tonkotsu Ramen (quick weeknight version)
  2: [
    s("Soft-boil the eggs", "Bring the pot of water to a boil. Lower in the eggs and cook for 6½ minutes, then move them to cold water.", "Cold water stops the cooking so the yolks stay jammy.", 6.5),
    s("Marinate the eggs", "Peel the eggs and let them sit in 2 tbsp soy sauce mixed with a splash of water while you cook.", "Turn them once so they color evenly.", null),
    s("Sear the pork belly", "Slice the pork belly thinly. Empty the pot, set it over medium-high heat and cook the slices until browned on both sides.", "Let the fat render — it becomes the base of your broth.", 5),
    s("Build the broth", "Pour 600 ml water into the pot with the pork fat, scraping up the browned bits. Simmer for 10 minutes, then lower the heat and whisk in the miso and remaining soy sauce.", "Don't boil the broth after adding miso — it dulls the flavor.", 10),
    s("Cook the noodles", "Pour the broth into serving bowls. Bring fresh water to a boil in the pot and cook the noodles for 2–3 minutes.", "Cook noodles in separate water so the broth stays clear.", 3),
    s("Assemble and serve", "Drain the noodles into the broth. Top with pork, the halved eggs and sliced green onions.", "Serve right away — ramen noodles soften quickly in hot broth.", null),
  ],
  // Street Tacos
  3: [
    s("Prep the toppings", "Finely dice the onion, chop the cilantro and cut the limes into wedges.", "Mix the onion and cilantro together — it's the classic taquería topping.", null),
    s("Brown the beef", "Heat the frying pan over medium-high. Add the beef and break it up, cooking until browned and a little crispy.", "Leave it alone for a minute at a time so it can brown properly.", 6),
    s("Season", "Stir in the cumin, salt, pepper and the juice of half a lime. Cook for 1 more minute.", "Taste now — it should be bold, since tortillas are plain.", 1),
    s("Warm the tortillas", "Spoon the beef into a bowl and wipe the pan. Warm each tortilla for about 30 seconds per side.", "Stack warm tortillas in a clean towel to keep them soft.", 1),
    s("Assemble", "Spoon beef onto doubled-up tortillas, top with onion and cilantro, and serve with lime wedges.", "Two tortillas per taco stops them from tearing.", null),
  ],
  // Margherita Pizza
  5: [
    s("Preheat the oven", "Put a baking tray on the top shelf and heat the oven as hot as it goes (about 250°C / 480°F).", "A screaming-hot tray is what gives you a crisp base.", 15),
    s("Make the sauce", "Mix the crushed tomatoes with the garlic, salt and 1 tbsp olive oil. No cooking needed.", "An uncooked sauce tastes fresher on pizza.", null),
    s("Stretch the dough", "On a floured surface, press the dough from the center outward into a 30 cm round, leaving a thicker rim.", "Use your fingertips, not a rolling pin, to keep air in the crust.", null),
    s("Top the pizza", "Spread a thin layer of sauce, leaving the rim bare. Scatter the torn mozzarella over it.", "Pat the mozzarella dry first so the pizza doesn't go soggy.", null),
    s("Bake", "Slide the pizza onto the hot tray and bake until the crust is blistered and the cheese is bubbling.", "Rotate halfway if your oven browns unevenly.", 10),
    s("Finish and slice", "Scatter the basil leaves, drizzle with the remaining olive oil and rest for 1 minute before slicing.", "Add basil after baking so it stays bright green.", null),
  ],
  // Spaghetti Carbonara
  6: [
    s("Cook the spaghetti", "Bring a big pot of lightly salted water to a boil and cook the spaghetti until al dente.", "Go easy on the salt — pecorino and guanciale are already salty.", 9),
    s("Crisp the guanciale", "Put the guanciale in a cold frying pan and set it over medium heat. Cook until golden and crisp. Add the smashed garlic for the last minute, then remove it.", "Starting in a cold pan renders the fat slowly without burning.", 7),
    s("Make the egg mixture", "Whisk the eggs with most of the pecorino and plenty of black pepper into a thick paste.", "Keep a little cheese back for serving.", null),
    s("Combine off the heat", "Save a cup of pasta water, then drain. Add the pasta to the guanciale pan, take it off the heat and let it cool for a minute.", "This pause is the secret — too hot and the eggs scramble.", 1),
    s("Make it creamy", "Pour in the egg mixture and toss quickly, adding pasta water a splash at a time until the sauce is glossy.", "If it starts to look grainy, add more pasta water and keep tossing.", null),
    s("Serve", "Plate immediately with the remaining pecorino and more black pepper.", "Carbonara waits for no one — eat it right away.", null),
  ],
  // Tiramisu
  7: [
    s("Brew the espresso", "Brew the espresso and let it cool in a shallow dish.", "Hot coffee makes the ladyfingers fall apart.", null),
    s("Whisk yolks and sugar", "Whisk the egg yolks with the sugar for 3–4 minutes until pale and thick.", "Use very fresh or pasteurized eggs — they aren't cooked.", 4),
    s("Add the mascarpone", "Fold the mascarpone into the yolk mixture until smooth.", "Cold mascarpone straight from the fridge mixes without splitting.", null),
    s("Fold in the whites", "Whip the egg whites to stiff peaks, then gently fold them in, in two additions.", "Fold with a spatula — stirring knocks out the air.", null),
    s("Dip and layer", "Dip each ladyfinger in the espresso for 1–2 seconds per side and lay them in your dish. Spread half the cream over them.", "A quick dip is enough; they keep soaking as they rest.", null),
    s("Repeat and chill", "Add a second layer of dipped ladyfingers and the remaining cream. Cover and chill for at least 4 hours.", "Overnight is even better — the flavors settle.", null),
    s("Dust and serve", "Dust generously with cocoa powder right before serving.", "Sift the cocoa for an even layer.", null),
  ],
  // Pad Thai
  8: [
    s("Soak the noodles", "Soak the rice noodles in hot tap water until pliable but still firm, then drain.", "They finish cooking in the pan, so don't let them get soft.", 10),
    s("Mix the sauce", "Stir together the tamarind paste and fish sauce, plus a little sugar if you have it.", "Taste it — it should be sour, salty and a little sweet.", null),
    s("Cook the shrimp", "Heat oil in the frying pan over high heat. Cook the shrimp until just pink, then push them to one side.", "High heat gives you that smoky street-stall flavor.", 2),
    s("Scramble the eggs", "Crack the eggs into the empty side of the pan and scramble until just set.", "Leave them in big curds.", 1),
    s("Toss with noodles", "Add the noodles and sauce and toss everything together until the sauce is absorbed.", "Add a splash of water if the noodles stick.", 3),
    s("Finish and serve", "Toss in the bean sprouts for 30 seconds, then serve topped with crushed peanuts and lime wedges.", "Sprouts should stay crunchy.", null),
  ],
  // Thai Green Curry
  9: [
    s("Prep", "Slice the chicken thighs and quarter the Thai eggplants.", "Keep eggplant in salted water so it doesn't brown.", null),
    s("Crack the coconut cream", "Spoon the thick cream from the top of one can into the pot. Simmer until the oil starts to separate.", "Separated coconut oil is what fries the paste properly.", 4),
    s("Fry the curry paste", "Stir in the green curry paste and fry until very fragrant.", "Keep stirring so it doesn't catch.", 2),
    s("Add the chicken", "Add the chicken and stir to coat it in the paste.", "Let it pick up color for a few minutes.", 3),
    s("Simmer", "Pour in the rest of the coconut milk, then add the torn lime leaves and eggplant. Simmer until the chicken is cooked and the eggplant is tender.", "Keep it at a gentle simmer, not a rolling boil.", 12),
    s("Season and finish", "Season with fish sauce to taste. Off the heat, stir in the Thai basil. Serve with rice.", "Add fish sauce a teaspoon at a time.", null),
  ],
  // Chicken Tikka Masala
  10: [
    s("Marinate the chicken", "Mix the chicken with the yogurt, 1 tbsp garam masala, 1 tbsp ginger-garlic paste and salt.", "Longer is better — up to overnight in the fridge.", 15),
    s("Preheat the grill", "Heat the grill to high.", "Oil the grates so the yogurt marinade doesn't stick.", null),
    s("Grill the chicken", "Grill the chicken, turning, until charred at the edges and cooked through.", "The charred bits are where the smoky flavor comes from.", 10),
    s("Start the sauce", "Melt the butter in the pot. Fry the remaining ginger-garlic paste for 1 minute, then the remaining garam masala for 30 seconds.", "Blooming spices in butter deepens their flavor.", 1),
    s("Simmer the tomatoes", "Add the crushed tomatoes and simmer until thick.", "Stir often so it doesn't stick.", 10),
    s("Combine", "Stir in the cream and the grilled chicken and simmer for 5 minutes.", "Don't boil hard once the cream is in.", 5),
    s("Serve", "Taste for salt and serve with rice or naan.", "A squeeze of lemon brightens it up.", null),
  ],
  // Butter Chicken
  11: [
    s("Season the chicken", "Toss the chicken with the chili powder, half the garam masala, 1 tbsp ginger-garlic paste and salt.", "Kashmiri chili gives color without much heat.", null),
    s("Roast the chicken", "Heat the oven to 220°C / 425°F. Spread the chicken on a tray and roast.", "Spread it out — crowded chicken steams instead of browning.", 15),
    s("Start the sauce", "While it roasts, melt 3 tbsp butter in the pot and cook the remaining ginger-garlic paste for 1 minute.", "Medium heat — butter burns easily.", 1),
    s("Cook the tomato", "Add the tomato puree and simmer until thick and a shade darker.", "The sauce is ready when butter starts pooling at the edges.", 10),
    s("Bring it together", "Stir in the cream, the remaining garam masala and the roasted chicken with its juices. Simmer gently.", "Pour in the tray juices — they're full of flavor.", 5),
    s("Finish", "Stir in the last tablespoon of butter, check the salt and serve with basmati rice.", "That last bit of butter makes it glossy.", null),
  ],
  // Vegetable Samosas (air fryer)
  12: [
    s("Make the filling", "Roughly mash the boiled potatoes. Mix in the peas, chili, garam masala, cumin seeds and salt.", "Crush the cumin seeds between your fingers to release their aroma.", null),
    s("Fold the samosas", "Place a spoonful of filling at one end of a wrapper strip. Fold it over diagonally, again and again, into a triangle. Seal the end with a dab of water.", "Press out air pockets as you fold.", null),
    s("Brush with oil", "Brush both sides of each samosa lightly with oil.", "A thin, even coat gives the crispiest result.", null),
    s("Preheat the air fryer", "Preheat the air fryer to 190°C / 375°F.", "A hot basket starts the crisping right away.", 3),
    s("Air fry", "Cook in a single layer, flipping halfway, until golden and crisp.", "Work in batches — don't stack them.", 10),
    s("Serve", "Let them cool for a couple of minutes and serve with chutney.", "The filling is very hot straight out of the fryer.", null),
  ],
  // Shoyu Ramen
  13: [
    s("Start the broth", "Cover the chicken bones with 2.5 L cold water and bring to a boil. Skim off the foam.", "Skimming early keeps the broth clear.", 5),
    s("Simmer broth and pork", "Add the pork belly, lower to a gentle simmer and cook.", "Bubbles should barely break the surface.", 45),
    s("Steep the kombu", "Turn off the heat, add the kombu and let it steep, then remove it.", "Boiling kombu turns the broth slimy and bitter.", 10),
    s("Make the tare", "Mix the soy sauce and mirin. Lift out the pork, slice it and brush it with a little tare.", "Tare is the seasoning base — it goes in the bowl, not the pot.", null),
    s("Prepare the eggs", "If your eggs aren't cooked yet, boil them for 6½ minutes, cool them in cold water and peel.", "Halve them with a thread or a wet knife for clean yolks.", 6.5),
    s("Cook the noodles", "Strain the broth into a large bowl. Bring fresh water to a boil in the pot and cook the noodles.", "Fresh ramen cooks fast — taste early.", 2),
    s("Assemble", "Put 2 tbsp tare in each bowl and add hot broth, then noodles, chashu, egg and scallions.", "Warm the bowls first so the soup stays hot.", null),
  ],
  // California Roll
  14: [
    s("Cook the rice", "Rinse the sushi rice until the water runs clear, then cook it in the rice cooker.", "Rinsing removes starch that makes rice gluey.", null),
    s("Season the rice", "Fold the rice vinegar (with a pinch of sugar and salt) into the warm rice. Cool to room temperature under a damp towel.", "Use a slicing motion — don't mash the grains.", null),
    s("Prep the fillings", "Julienne the cucumber, slice the avocado and shred the crab.", "Squeeze lemon over the avocado to stop it browning.", null),
    s("Spread the rice", "Lay nori on plastic wrap. Spread a thin, even layer of rice over it, sprinkle with sesame seeds and flip it so the nori faces up.", "Wet your hands so the rice doesn't stick to them.", null),
    s("Fill and roll", "Line up the crab, avocado and cucumber along one edge and roll up tightly, pressing as you go.", "Tight rolls slice cleanly.", null),
    s("Slice", "Cut each roll into 8 pieces with a sharp, wet knife.", "Wipe the knife between cuts.", null),
  ],
  // Kung Pao Chicken
  15: [
    s("Marinate the chicken", "Toss the diced chicken with 1 tbsp soy sauce (and a teaspoon of cornstarch if you have it).", "Cornstarch keeps the chicken silky.", 10),
    s("Mix the sauce", "Stir together the remaining soy sauce, the black vinegar, a teaspoon of sugar and a splash of water.", "Have it ready — stir-frying moves fast.", null),
    s("Toast the aromatics", "Heat oil over medium-low. Fry the dried chilies and Sichuan peppercorns until darkened and fragrant.", "Pull them before they turn black, or they'll go bitter.", 1),
    s("Stir-fry the chicken", "Turn the heat to high and stir-fry the chicken until cooked through.", "Spread it out so every piece touches the pan.", 4),
    s("Add the sauce", "Add the scallion whites and the sauce, and toss until glossy.", "The sauce should cling, not pool.", 1),
    s("Finish", "Toss in the peanuts and scallion greens. Serve with rice.", "Add peanuts last so they stay crunchy.", null),
  ],
  // Pork Dumplings
  16: [
    s("Salt the cabbage", "Toss the minced cabbage with a pinch of salt, wait, then squeeze out as much water as you can.", "Dry cabbage means the dumplings won't go soggy.", 10),
    s("Mix the filling", "Combine the pork, cabbage, ginger, soy sauce, sesame oil and scallions. Stir in one direction until sticky.", "Stirring one way gives a bouncy, juicy filling.", null),
    s("Fold the dumplings", "Put a teaspoon of filling in each wrapper, wet the edge, fold it in half and pleat it closed.", "Keep unused wrappers covered so they don't dry out.", null),
    s("Steam", "Line the steamer with parchment and steam the dumplings over boiling water.", "Leave space between them — they swell.", 10),
    s("Crisp the bottoms", "Heat a little oil in the frying pan and fry the steamed dumplings flat-side down until golden.", "Medium-high heat crisps without burning.", 2),
    s("Serve", "Serve with a dip of soy sauce mixed with vinegar.", "Add chili oil if you like heat.", null),
  ],
  // Mapo Tofu
  17: [
    s("Prep the tofu", "Cut the tofu into cubes and let them sit in hot salted water while you cook.", "Warm salted water firms the tofu so it holds together.", 5),
    s("Brown the pork", "Heat oil in the frying pan over high heat and cook the pork until browned and crisp.", "Crispy pork adds texture to the soft tofu.", 4),
    s("Fry the chili paste", "Lower the heat, add the doubanjiang and garlic, and fry until the oil turns red.", "That red oil carries the dish's flavor.", 1),
    s("Simmer the tofu", "Add 1 cup water or stock, bring to a simmer and slide in the drained tofu.", "Shake the pan instead of stirring so the tofu doesn't break.", 5),
    s("Thicken", "Drizzle in the cornstarch slurry in 2–3 additions until the sauce coats the tofu.", "Add slowly — you can always add more.", null),
    s("Finish and serve", "Sprinkle with ground Sichuan pepper and scallions. Serve over steamed rice.", "Ground Sichuan pepper gives the signature tingle.", null),
  ],
  // Tacos al Pastor
  18: [
    s("Soften the chilies", "Remove the stems and seeds from the guajillo chilies and soak them in hot water.", "Toast them in a dry pan for a few seconds first for extra depth.", 15),
    s("Make the marinade", "Blend or finely mash the chilies with the achiote paste, a quarter of the pineapple, a splash of the soaking water and salt.", "It should be thick enough to cling to the meat.", null),
    s("Marinate the pork", "Coat the pork slices in the marinade.", "Overnight in the fridge gives the best flavor.", 20),
    s("Grill pork and pineapple", "Heat the grill to high. Grill the pork and the remaining pineapple until charred at the edges.", "Char is the point — don't move the meat too early.", 4),
    s("Chop and warm", "Chop the pork and pineapple. Warm the tortillas on the grill for about 30 seconds each.", "Chop finely, like at a street stand.", null),
    s("Assemble", "Fill the tortillas with pork and pineapple, then top with onion and cilantro.", "A squeeze of lime finishes it perfectly.", null),
  ],
  // Guacamole
  19: [
    s("Mellow the onion", "Rinse the minced red onion under cold water and drain.", "This takes away the harsh raw bite.", null),
    s("Scoop the avocados", "Halve the avocados, remove the pits and scoop the flesh into a bowl.", "Ripe avocados give slightly when pressed.", null),
    s("Mash", "Mash with the lime juice and salt, leaving it chunky.", "Lime keeps it green and bright.", null),
    s("Fold in the rest", "Fold in the onion, jalapeño and cilantro.", "Remove the jalapeño seeds for less heat.", null),
    s("Taste and serve", "Adjust the salt and lime, then serve right away.", "To store it, press plastic wrap directly onto the surface.", null),
  ],
  // Churros
  20: [
    s("Make cinnamon sugar", "Mix the sugar (keeping 1 tbsp aside) with the cinnamon on a plate.", "You'll roll the churros in it while they're hot.", null),
    s("Cook the dough", "Bring 1 cup water, the butter, 1 tbsp sugar and a pinch of salt to a boil. Add the flour all at once and stir until it forms a ball.", "Keep stirring for a minute to dry the dough slightly.", 1),
    s("Add the eggs", "Let the dough cool, then beat in the eggs one at a time until smooth and glossy.", "If the dough is too hot, the eggs will cook.", 5),
    s("Heat the oil", "Heat 2–3 cm of oil in the frying pan to 180°C / 350°F.", "A bit of dough should sizzle immediately.", null),
    s("Pipe and fry", "Pipe 10 cm lengths of dough straight into the oil, snipping with scissors. Fry, turning, until deep golden.", "A star-shaped nozzle gives the classic ridges.", 3),
    s("Coat and serve", "Drain briefly, then roll in cinnamon sugar while hot. Serve with melted chocolate.", "Coat right away so the sugar sticks.", null),
  ],
  // Coq au Vin
  21: [
    s("Season the chicken", "Pat the chicken dry and season well with salt and pepper.", "Dry skin browns; wet skin steams.", null),
    s("Render the bacon", "Cook the bacon lardons in the pot over medium heat until crisp, then remove them.", "Leave the fat in the pot for browning.", 6),
    s("Brown the chicken", "Brown the chicken skin-side down in the bacon fat, in batches, then turn it.", "Don't crowd the pot.", 5),
    s("Brown the vegetables", "Brown the pearl onions and mushrooms, then set them aside.", "Adding them back later keeps them from going mushy.", 5),
    s("Braise", "Pour in the wine and scrape up the browned bits. Add the stock, thyme, bacon and chicken. Cover and simmer gently.", "Low and slow makes the chicken tender.", 45),
    s("Reduce and finish", "Return the onions and mushrooms and simmer uncovered until the sauce is glossy.", "Taste and season at the end — the sauce concentrates.", 10),
    s("Serve", "Serve with mashed potatoes or crusty bread.", "It's even better the next day.", null),
  ],
  // Ratatouille
  22: [
    s("Preheat the oven", "Heat the oven to 190°C / 375°F.", "Use the time to slice your vegetables thinly and evenly.", null),
    s("Make the base", "In the pot, cook the bell pepper and garlic in 1 tbsp olive oil, then add one sliced tomato, chopped, and cook until soft.", "This sauce flavors everything from underneath.", 8),
    s("Layer the vegetables", "Spread the base in a baking dish. Arrange the eggplant, zucchini and tomato slices on top in an overlapping spiral.", "Slices of similar size cook evenly.", null),
    s("Season", "Drizzle with the remaining olive oil, sprinkle with herbes de Provence and salt, and cover with foil.", "Foil steams the vegetables tender first.", null),
    s("Bake covered", "Bake covered.", "The vegetables should be soft when poked.", 25),
    s("Bake uncovered", "Remove the foil and bake until the edges are lightly browned.", "Serve warm or at room temperature.", 10),
  ],
  // Crème Brûlée
  23: [
    s("Preheat", "Heat the oven to 160°C / 325°F and boil a kettle for the water bath.", "A gentle water bath keeps the custard silky.", null),
    s("Infuse the cream", "Heat the cream with the vanilla seeds and pod until just steaming, then turn off the heat and steep.", "Don't let it boil.", 10),
    s("Make the custard", "Whisk the yolks with ⅓ cup sugar, then slowly pour in the warm cream while whisking.", "Pour slowly so the yolks don't scramble.", null),
    s("Fill the ramekins", "Strain into ramekins and set them in a baking dish. Pour hot water halfway up their sides.", "Straining guarantees a smooth custard.", null),
    s("Bake", "Bake until the edges are set but the centers still wobble.", "They firm up as they cool.", 30),
    s("Chill", "Cool, then refrigerate for at least 2 hours.", "Cold custard contrasts with the hot sugar crust.", null),
    s("Caramelize", "Sprinkle a thin layer of sugar on each and caramelize under a very hot broiler (or with a torch).", "Watch closely — sugar goes from golden to burnt fast.", 2),
  ],
  // Moussaka
  24: [
    s("Salt the eggplant", "Salt the eggplant slices and let them sit, then pat them dry.", "Salting draws out bitterness and extra water.", 15),
    s("Roast the eggplant", "Heat the oven to 200°C / 400°F. Brush the slices with oil and roast until soft.", "Roasting uses far less oil than frying.", 15),
    s("Brown the lamb", "Brown the lamb in the frying pan, breaking it up.", "Pour off excess fat if there's a lot.", 8),
    s("Simmer the meat sauce", "Add the tomatoes, cinnamon and salt, and simmer until thick.", "Cinnamon is the classic Greek touch.", 15),
    s("Make the béchamel", "Melt the butter in a saucepan and whisk in the flour for 1 minute. Gradually whisk in the milk until thick, then stir in half the parmesan.", "Add the milk slowly to avoid lumps.", 5),
    s("Layer", "In a baking dish, layer eggplant, then meat, then eggplant again. Top with béchamel and the remaining parmesan.", "Spread the béchamel all the way to the edges.", null),
    s("Bake and rest", "Lower the oven to 180°C / 350°F and bake until golden. Rest before cutting.", "Resting for 15 minutes lets the layers set.", 40),
  ],
  // Baklava
  25: [
    s("Prep", "Heat the oven to 175°C / 350°F. Mix the walnuts with the cinnamon.", "Keep the phyllo under a damp towel so it doesn't dry out.", null),
    s("Make the syrup", "Simmer the honey, sugar, ½ cup water and lemon juice, then let it cool.", "Cool syrup on hot baklava keeps it crisp.", 10),
    s("Base layers", "Brush a pan with butter and lay down 8 sheets of phyllo, brushing each with butter.", "Brush lightly — every sheet needs some butter.", null),
    s("Nut layers", "Sprinkle a layer of nuts, cover with 2 buttered sheets and repeat until the nuts are used. Finish with 8 buttered sheets.", "Press gently to compact each layer.", null),
    s("Cut", "Cut into diamonds all the way through before baking.", "It's impossible to cut neatly once baked.", null),
    s("Bake", "Bake until deep golden and crisp.", "Golden-brown, not pale — pale baklava is soggy.", 45),
    s("Add the syrup", "Pour the cooled syrup over the hot baklava and let it rest uncovered for several hours.", "Covering it traps steam and softens the layers.", null),
  ],
  // Seafood Paella
  26: [
    s("Warm the stock", "Warm the fish stock with the saffron and let it steep.", "Crumble the saffron threads to release more color.", null),
    s("Sear the shrimp", "Heat olive oil in the wide pot and sear the shrimp for 1 minute per side, then remove them.", "They finish cooking on the rice later.", 2),
    s("Build the sofrito", "Cook the bell pepper until soft, add the squid for 2 minutes, then the grated tomato until jammy.", "A deep, jammy sofrito is the flavor foundation.", 5),
    s("Toast the rice", "Stir in the rice to coat it in the sofrito for 1 minute.", "This is the last time you stir!", 1),
    s("Simmer — don't stir", "Pour in the hot stock, spread the rice evenly and simmer without stirring.", "Rotate the pot instead of stirring if your burner heats unevenly.", 18),
    s("Add the seafood", "Nestle in the mussels and shrimp, cover and cook until the mussels open.", "Throw away any mussels that stay closed.", 5),
    s("Make the socarrat", "Raise the heat for 1–2 minutes until the bottom crackles, then rest for 5 minutes.", "The crispy bottom layer (socarrat) is the prize.", 2),
  ],
  // Gazpacho
  27: [
    s("Soak the bread", "Soak the stale bread in water, then squeeze it dry.", "Bread gives gazpacho its body.", 5),
    s("Chop the vegetables", "Roughly chop the tomatoes, cucumber and red pepper.", "Keep a little cucumber aside for garnish.", null),
    s("Blend", "Blend the vegetables, bread, garlic, vinegar and salt until smooth.", "Blend longer than you think for a silky texture.", 1),
    s("Emulsify", "With the blender running, slowly pour in the olive oil.", "This makes it creamy without any dairy.", null),
    s("Chill", "Chill for at least an hour, then taste and adjust the salt and vinegar.", "Cold food needs more seasoning than warm food.", null),
    s("Serve", "Serve cold with a drizzle of olive oil and diced cucumber.", "Serve it in glasses for a summer-party feel.", null),
  ],
  // Bibimbap
  28: [
    s("Cook the rice", "Cook the rice in the rice cooker, or reheat cooked rice.", "Slightly crispy rice is a bonus — some people use a hot stone bowl.", null),
    s("Season the spinach", "Squeeze the blanched spinach dry and season with a pinch of salt (and sesame oil if you have it).", "Season each topping separately — that's the bibimbap way.", null),
    s("Cook the vegetables", "In the frying pan, sauté the carrot for 2 minutes and set it aside, then cook the mushrooms for 3 minutes.", "Cook each vegetable on its own so the colors stay distinct.", 3),
    s("Cook the beef", "Cook the bulgogi beef over high heat until caramelized.", "Spread it in a single layer.", 4),
    s("Fry the eggs", "Fry the eggs sunny-side up with runny yolks.", "The yolk becomes part of the sauce.", 3),
    s("Make the sauce", "Thin the gochujang with a splash of water (plus sesame oil and sugar if you have them).", "Adjust the sweetness to taste.", null),
    s("Assemble", "Top bowls of rice with the toppings in sections, an egg in the center and sauce on the side. Mix everything at the table.", "Mix well — every bite should have everything.", null),
  ],
  // Kimchi Jjigae
  29: [
    s("Slice the pork", "Cut the pork belly into bite-size pieces.", "Partly frozen pork slices more easily.", null),
    s("Render the pork", "Cook the pork in the pot over medium-high heat until the fat renders.", "That fat carries the flavor.", 4),
    s("Fry the kimchi", "Add the kimchi, garlic and gochugaru and stir-fry.", "Older, sour kimchi makes the best stew.", 3),
    s("Simmer", "Add 2½ cups water (and some kimchi juice), bring to a boil, then simmer.", "Kimchi juice adds depth — don't throw it out.", 15),
    s("Add the tofu", "Spoon in the soft tofu and simmer gently.", "Big spoonfuls keep the tofu silky.", 5),
    s("Serve", "Top with scallions, taste for salt and serve bubbling hot with rice.", "Serve it straight from the pot.", null),
  ],
  // Beef Pho
  30: [
    s("Parboil the bones", "Cover the bones with water, boil hard, then drain and rinse them and the pot.", "This step is the secret to a crystal-clear broth.", 5),
    s("Char the onion", "Blacken the onion halves directly over a flame or in the dry pot.", "Charred onion gives pho its sweet, smoky note.", 5),
    s("Toast the spices", "Toast the star anise and cinnamon in the dry pot until fragrant.", "Watch closely — whole spices burn fast.", 1),
    s("Simmer the broth", "Add the bones, onion, spices and 3.5 L water. Simmer gently, skimming, then season with salt or fish sauce.", "Never let it boil hard — that clouds the broth.", 60),
    s("Prep noodles and beef", "Soak the rice noodles following the package directions. Slice the sirloin paper-thin.", "Freeze the beef for 15 minutes for easy, thin slicing.", null),
    s("Assemble", "Put noodles and raw beef in bowls and ladle boiling broth over the top to cook the beef. Serve with bean sprouts and Thai basil.", "The broth must be at a full boil to cook the beef.", null),
  ],
  // Banh Mi
  31: [
    s("Prep the pork", "Slice the pork belly thinly and season with salt and pepper (and a dash of soy sauce).", "Thin slices crisp up faster.", null),
    s("Fry the pork", "Fry the slices until browned and crispy on both sides.", "Medium-high heat, single layer.", 4),
    s("Warm the baguette", "Warm the baguette in the pan to crisp the crust, then split it lengthwise.", "A crackly crust is what makes banh mi.", 2),
    s("Spread", "Spread mayonnaise (and pâté, if using) inside the bread.", "Spread to the edges for flavor in every bite.", null),
    s("Fill", "Layer in the pork, pickled carrot and daikon, cucumber, jalapeño and cilantro.", "Generous cilantro is non-negotiable.", null),
    s("Serve", "Press the sandwich closed, cut it in half and serve.", "Best eaten within minutes.", null),
  ],
  // Doro Wat
  32: [
    s("Cook the onions dry", "Cook the minced onions in the dry pot over medium-low heat, stirring often, until deep brown and jammy.", "No oil yet — dry-cooking is the traditional technique.", 20),
    s("Add the butter and aromatics", "Stir in the niter kibbeh, garlic and ginger and cook.", "Plain butter plus a pinch of spices works if you don't have niter kibbeh.", 3),
    s("Bloom the berbere", "Stir in the berbere and cook, adding a splash of water if it sticks.", "This is where the deep red color develops.", 2),
    s("Braise the chicken", "Add the chicken and 1 cup water. Cover and simmer, turning occasionally.", "The sauce should be thick, like a stew.", 35),
    s("Add the eggs", "Score the peeled eggs and simmer them in the sauce.", "Scoring lets the sauce soak in.", 10),
    s("Serve", "Serve with injera or rice.", "Each person traditionally gets an egg.", null),
  ],
  // Chicken Tagine
  33: [
    s("Season the chicken", "Rub the chicken with ras el hanout and salt.", "Let it sit while you slice the onion.", 10),
    s("Brown the chicken", "Brown the chicken skin-side down in a little oil, turn it, then remove.", "Golden skin adds flavor to the whole dish.", 5),
    s("Soften the onion", "Cook the onion in the drippings until soft.", "Scrape up the browned bits.", 5),
    s("Braise", "Return the chicken, add the stock and apricots, cover and simmer.", "A gentle simmer keeps the meat tender.", 35),
    s("Add the lemon and olives", "Add the preserved lemon and olives and simmer uncovered.", "Rinse the preserved lemon if it's very salty.", 10),
    s("Serve", "Serve with couscous or bread.", "Fresh cilantro or parsley on top is lovely.", null),
  ],
  // Hummus
  34: [
    s("Whip the tahini", "Blend the tahini and lemon juice until thick and fluffy.", "Stir the tahini jar well first — the oil separates.", 1),
    s("Add the flavorings", "Add the garlic, cumin and salt and blend again.", "Start with less garlic; you can add more.", null),
    s("Add the chickpeas", "Add the chickpeas in two batches and blend, scraping down the sides.", "Peeling the chickpeas makes it ultra-smooth.", 2),
    s("Make it silky", "With the motor running, add 2–4 tbsp ice-cold water until silky.", "Ice water makes hummus lighter and creamier.", null),
    s("Serve", "Taste and adjust, then serve with a swirl of olive oil.", "A dusting of paprika looks great.", null),
  ],
  // Shish Kebab
  35: [
    s("Marinate the lamb", "Mix the lamb with the yogurt, paprika, lemon juice, olive oil and salt.", "Yogurt tenderizes the meat.", 20),
    s("Thread the skewers", "Thread the lamb, pepper and onion alternately onto skewers.", "Soak wooden skewers in water first so they don't burn.", null),
    s("Heat the grill", "Heat the grill to high.", "Clean, oiled grates stop sticking.", null),
    s("Grill", "Grill, turning every 2 minutes, until charred outside and juicy inside.", "Medium is ideal for lamb.", 10),
    s("Rest and serve", "Rest for 5 minutes, then serve with flatbread.", "Resting keeps the juices in the meat.", null),
  ],
  // Classic Cheeseburger
  36: [
    s("Shape the patties", "Divide the beef into 4 and shape patties slightly wider than the buns, pressing a dimple into the center.", "The dimple stops them from puffing up.", null),
    s("Heat the grill", "Heat the grill (or frying pan) to high. Season the patties just before cooking.", "Salting too early makes burgers dense.", null),
    s("Cook the first side", "Cook without pressing down.", "Pressing squeezes out the juices.", 4),
    s("Flip and add cheese", "Flip, lay the cheese on top and cook until done to your liking.", "3 minutes is about medium.", 3),
    s("Toast the buns", "Toast the buns cut-side down in the pan.", "Toasted buns don't go soggy.", 1),
    s("Assemble", "Build your burgers with lettuce, tomato, onion, ketchup and mustard.", "Lettuce under the patty protects the bun.", null),
  ],
  // BBQ Pulled Pork
  37: [
    s("Season the pork", "Cut the pork into 4 chunks and rub with the brown sugar, smoked paprika and salt.", "Bigger chunks stay juicier.", null),
    s("Sear", "Sear the pork on the pressure cooker's sauté setting.", "Browning adds deep flavor.", 6),
    s("Add the liquid", "Add the vinegar, ½ cup barbecue sauce and ½ cup water.", "Scrape the bottom so the cooker doesn't show a burn warning.", null),
    s("Pressure cook", "Cook on high pressure, then let the pressure release naturally for 10 minutes.", "Natural release keeps the meat tender.", 60),
    s("Shred", "Shred the pork with two forks and discard any big pieces of fat.", "It should fall apart easily.", null),
    s("Sauce it", "Reduce the cooking liquid on sauté, then mix in the remaining sauce and the pork.", "Reducing concentrates the flavor.", 5),
    s("Serve", "Pile onto buns.", "Add coleslaw for crunch.", null),
  ],
  // Buttermilk Pancakes
  38: [
    s("Mix the dry ingredients", "Whisk the flour, baking powder, sugar and a pinch of salt.", "Add ½ tsp baking soda if you have it for extra fluffiness.", null),
    s("Mix the wet ingredients", "Whisk the buttermilk, eggs and melted butter.", "Let the melted butter cool slightly first.", null),
    s("Combine", "Fold the wet ingredients into the dry until just combined, then let the batter rest.", "Lumps are fine — overmixing makes pancakes tough.", 5),
    s("Heat the pan", "Heat the frying pan over medium and add a little butter.", "Test with a drop of batter first.", null),
    s("Cook", "Pour ¼ cup batter per pancake and cook until bubbles form and the edges set.", "Don't flip until the bubbles pop and stay open.", 2),
    s("Flip and serve", "Flip and cook for 1–2 more minutes. Serve with maple syrup.", "Keep the finished ones warm in a low oven.", 2),
  ],
  // Fish and Chips
  39: [
    s("Prep the chips", "Cut the potatoes into thick chips, soak them in cold water, then dry thoroughly.", "Soaking removes starch for crispier chips.", 10),
    s("Air fry the chips", "Toss with 1 tbsp oil and salt and air fry at 200°C / 400°F, shaking halfway.", "Don't overfill the basket.", 20),
    s("Make the batter", "Whisk the flour, a pinch of salt and the cold beer until smooth and as thick as heavy cream.", "Ice-cold batter makes a crunchier crust.", null),
    s("Heat the oil", "Heat 2–3 cm of oil in the frying pan to 180°C / 350°F.", "A drop of batter should sizzle and float immediately.", null),
    s("Batter the fish", "Pat the fish dry, dust it with flour and dip it in the batter.", "The flour helps the batter stick.", null),
    s("Fry the fish", "Lay the fish into the oil away from you and fry until deep golden, turning once.", "About 3 minutes per side.", 6),
    s("Serve", "Drain on a rack and serve with salt and malt vinegar.", "A rack keeps the bottom crisp.", null),
  ],
  // Shepherd's Pie
  40: [
    s("Boil the potatoes", "Boil the potatoes in salted water until tender.", "They're ready when a knife slides in easily.", 18),
    s("Mash", "Drain and mash with 3 tbsp butter, salt and pepper. Heat the oven to 200°C / 400°F.", "Mash while hot for the smoothest result.", null),
    s("Brown the lamb", "Brown the lamb in the empty pot and drain off excess fat.", "Good browning means a richer filling.", 8),
    s("Make the filling", "Add the carrots for 3 minutes, then the stock and Worcestershire. Simmer until thick and stir in the peas.", "The filling should be saucy but not runny.", 10),
    s("Assemble", "Spread the filling in a baking dish, top with mash and rough it up with a fork. Dot with the last of the butter.", "Fork ridges turn extra crispy.", null),
    s("Bake", "Bake until golden and bubbling.", "Rest for 10 minutes before serving.", 25),
  ],
  // Bratwurst with Sauerkraut
  41: [
    s("Cook the onion", "Soften the onion in a little oil in the pot.", "Let it get a little golden.", 5),
    s("Simmer the sauerkraut", "Add the sauerkraut, apple, caraway seeds and ½ cup water and simmer.", "Rinse the sauerkraut first if it's very sour.", 15),
    s("Grill the brats", "Grill the bratwurst over medium heat, turning often.", "Medium heat stops the skins from bursting.", 12),
    s("Combine", "Nestle the grilled brats into the sauerkraut for a few minutes.", "They soak up the tangy flavors.", null),
    s("Serve", "Serve with whole grain mustard.", "Rye bread or potatoes on the side.", null),
  ],
  // Feijoada
  42: [
    s("Drain the beans", "Drain and rinse the soaked beans.", "Soak overnight for even cooking.", null),
    s("Brown the meats", "Sauté the bacon in the pressure cooker, then add the ribs and brown them.", "Browning builds a deep, smoky base.", 5),
    s("Add the aromatics", "Add the onion and garlic and cook until soft.", "Scrape up the browned bits.", 3),
    s("Pressure cook", "Add the beans, sausage, bay leaves and water to cover by 5 cm. Cook at high pressure, then release naturally.", "Make sure the beans are fully submerged.", 40),
    s("Thicken", "Simmer uncovered on sauté, mashing a ladle of beans against the side to thicken.", "It should be thick and creamy.", 10),
    s("Serve", "Season and serve with rice and orange slices.", "Orange slices are the traditional fresh side.", null),
  ],
  // Ceviche
  43: [
    s("Mellow the onion", "Soak the sliced red onion in cold water and drain.", "This tames the raw onion bite.", null),
    s("Prep the fish", "Cut the fish into 2 cm cubes, keep it cold and season with salt.", "Use the freshest fish you can find.", null),
    s("Cure in lime", "Add the aji amarillo and pour over enough lime juice to cover. Marinate until the fish turns opaque outside.", "Don't over-marinate — the fish turns rubbery.", 12),
    s("Fold in the fresh bits", "Fold in the onion and cilantro.", "Add them now so they stay crisp.", null),
    s("Serve", "Serve right away with sweet potato slices and corn, spooning the lime juice over the top.", "That citrusy juice is called leche de tigre.", null),
  ],
  // Beef Empanadas
  44: [
    s("Cook the onion", "Cook the onion in a little oil in the frying pan until soft.", "Sweet, soft onions make a juicy filling.", 5),
    s("Brown the beef", "Add the beef, cumin, smoked paprika and salt, and cook until browned. Cool completely.", "Hot filling melts the dough — let it cool.", 6),
    s("Finish the filling", "Stir in the chopped olives and eggs.", "These are classic in Argentina.", null),
    s("Preheat", "Heat the oven to 200°C / 400°F.", "Line a tray with parchment.", null),
    s("Fill and seal", "Put 2 tbsp filling on each disc, fold it over and crimp the edges with a fork or by twisting.", "Wet the edge with water so it seals.", null),
    s("Bake", "Bake until golden.", "Brush with milk or beaten egg for shine.", 20),
  ],
  // Jerk Chicken
  45: [
    s("Make the marinade", "Blend or finely chop the scotch bonnets, allspice, thyme, scallions, soy sauce, lime juice and salt.", "Wear gloves — scotch bonnets are very hot.", null),
    s("Marinate", "Slash the chicken and rub the marinade deep into the cuts.", "Overnight marinating is best.", 30),
    s("Set up the grill", "Heat the grill to medium, leaving one side cooler.", "Two zones let you cook through without burning.", null),
    s("Cook over indirect heat", "Grill skin-side down on the cooler side with the lid closed.", "The slow start keeps the meat juicy.", 20),
    s("Char", "Move to direct heat and turn until charred and cooked through (74°C / 165°F).", "Those charred bits are classic jerk.", 10),
    s("Rest and serve", "Rest for 5 minutes and serve with lime.", "Rice and peas make the perfect side.", null),
  ],
  // Jollof Rice
  46: [
    s("Blend the base", "Blend the tomatoes, red pepper, scotch bonnet and half the onion until smooth.", "Leave the scotch bonnet out if you want it mild.", null),
    s("Fry the base", "Fry the remaining onion in oil, add the blended base and cook until reduced and the oil rises to the top.", "Frying the base well is the secret to great jollof.", 15),
    s("Rinse the rice", "Rinse the rice until the water runs clear.", "This stops it going mushy.", null),
    s("Cook the rice", "Add the rice, stock, bay leaves and salt and stir once. Cover tightly (with foil under the lid) and cook on the lowest heat.", "Don't lift the lid — the steam cooks the rice.", 25),
    s("Check and fluff", "Fluff the rice. If it's still firm, add a splash of stock and cook a few minutes longer.", "Every grain should be separate and tender.", null),
    s("Rest and serve", "Rest covered for 5 minutes.", "A slightly smoky bottom is prized as 'party jollof'.", 5),
  ],
  // Beef Stroganoff
  47: [
    s("Cook the noodles", "Cook the egg noodles in salted boiling water, then drain and toss with a little butter.", "Butter stops them from sticking.", 7),
    s("Sear the beef", "Sear the beef strips in a hot frying pan in batches, then remove them.", "Quick and hot — the beef should stay pink inside.", 2),
    s("Brown the mushrooms", "Cook the mushrooms and onion until browned.", "Don't salt the mushrooms until they've browned.", 6),
    s("Make the sauce", "Add the stock and mustard and simmer.", "Scrape up the browned bits.", 3),
    s("Add the sour cream", "Lower the heat and stir in the sour cream. Return the beef for 1 minute.", "Don't boil the sauce or the sour cream will split.", 1),
    s("Serve", "Spoon over the noodles.", "Fresh dill or parsley on top.", null),
  ],
  // Goulash
  48: [
    s("Brown the beef", "Brown the beef in batches on the sauté setting, then remove it.", "Batches give better browning.", 6),
    s("Cook the onions", "Cook the onions until golden.", "Patience here builds sweetness.", 8),
    s("Add the paprika", "Turn off the heat and stir in the paprika and caraway.", "Paprika burns easily — that's why the heat is off.", null),
    s("Pressure cook", "Return the beef, add the stock and cook at high pressure, then release naturally for 10 minutes.", "The beef should be nearly tender.", 25),
    s("Add the vegetables", "Add the potatoes and carrots, pressure cook again, then quick release.", "Short cooking keeps them from falling apart.", 5),
    s("Serve", "Season and serve with bread and a spoonful of sour cream.", "Goulash tastes even better the next day.", null),
  ],
  // Pierogi
  49: [
    s("Make the dough", "Mix the flour, a pinch of salt and about 1 cup warm water. Knead for 5 minutes, then rest covered.", "Rested dough rolls out without springing back.", 20),
    s("Caramelize the onions", "Cook the onions slowly in 2 tbsp butter until golden.", "Low heat — these are the topping too.", 15),
    s("Make the filling", "Mash the potatoes with the cheese, half the onions, salt and pepper.", "Taste it — the filling should be well seasoned.", null),
    s("Shape", "Roll the dough to 2 mm, cut 8 cm circles, fill each one and seal firmly.", "Any gaps will burst while boiling.", null),
    s("Boil", "Boil in batches in salted water until they float, then 2–3 minutes more.", "Don't crowd the pot.", 3),
    s("Pan-fry and serve", "Fry in the remaining butter until golden. Top with the onions and sour cream.", "About 2 minutes per side.", 4),
  ],
  // Nasi Goreng
  50: [
    s("Break up the rice", "Break the cold rice into separate grains with your hands.", "Day-old rice fries best — fresh rice goes mushy.", null),
    s("Fry the aromatics", "Fry the chilies and shrimp paste in oil until fragrant.", "Open a window — shrimp paste is pungent!", 1),
    s("Cook the shrimp", "Add the shrimp and cook until pink.", "Keep the heat high.", 2),
    s("Fry the rice", "Add the rice and toss over high heat.", "Spread it out to get some crispy bits.", 4),
    s("Season", "Add the kecap manis and toss until coated and lightly caramelized.", "Kecap manis is sweet soy sauce.", 1),
    s("Top with egg", "Fry the eggs separately until the edges are crispy and serve them on top. Garnish with fried shallots.", "A runny yolk acts as extra sauce.", 3),
  ],
  // Chicken Satay
  51: [
    s("Soak the skewers", "Soak the bamboo skewers in water.", "This stops them burning on the grill.", null),
    s("Marinate", "Mix the chicken with the turmeric, lemongrass, 1 tbsp soy sauce and half the coconut milk.", "Turmeric gives satay its golden color.", 20),
    s("Make the peanut sauce", "Warm the peanut butter, remaining coconut milk, soy sauce and a splash of water, whisking until pourable.", "Add chili or lime to taste.", null),
    s("Thread", "Thread the chicken onto the skewers.", "Pack the pieces tightly so they stay juicy.", null),
    s("Grill", "Grill over high heat, turning once.", "Look for charred edges.", 8),
    s("Serve", "Serve with the peanut sauce.", "Cucumber and onion on the side.", null),
  ],
  // Chicken Adobo
  52: [
    s("Marinate", "Combine the chicken, soy sauce, garlic, bay leaves and peppercorns.", "Even a short marinade helps.", 15),
    s("Add the vinegar", "Add the vinegar and ½ cup water and bring to a boil without stirring.", "Not stirring lets the sharp vinegar edge cook off.", null),
    s("Braise", "Cover and simmer.", "Turn the chicken halfway through.", 25),
    s("Reduce", "Uncover and simmer until the sauce is glossy.", "Brown the chicken in a little oil for extra flavor if you like.", 10),
    s("Serve", "Serve over steamed rice with plenty of sauce.", "Adobo tastes even better the next day.", null),
  ],
  // Shakshuka
  53: [
    s("Cook the vegetables", "Cook the onion and red pepper in olive oil in the frying pan until soft.", "Medium heat — soft, not browned.", 6),
    s("Bloom the spices", "Stir in the cumin and paprika.", "30 seconds is enough.", null),
    s("Simmer the sauce", "Add the tomatoes and salt and simmer until thickened.", "Thick sauce holds the eggs in place.", 10),
    s("Add the eggs", "Make wells in the sauce and crack an egg into each one.", "Crack each egg into a cup first.", null),
    s("Cook covered", "Cover and cook until the whites are set but the yolks are runny.", "Check often after 4 minutes.", 6),
    s("Finish", "Scatter with feta and serve with bread.", "Fresh herbs on top look and taste great.", null),
  ],
  // Matcha Mochi
  54: [
    s("Freeze the filling", "Divide the red bean paste into 8 balls and freeze them.", "Firm filling is much easier to wrap.", 15),
    s("Make the batter", "Whisk the glutinous rice flour, matcha, sugar and water in a microwave-safe bowl until smooth.", "Sift the matcha to avoid lumps.", null),
    s("First microwave", "Cover and microwave, then stir with a wet spatula.", "A wet spatula stops sticking.", 1),
    s("Second microwave", "Microwave again and stir. Repeat in 30-second bursts until translucent and stretchy.", "It's done when it's glossy and elastic.", 1),
    s("Divide", "Turn out onto a cornstarch-dusted surface and divide into 8.", "Dust your hands well with cornstarch.", null),
    s("Wrap", "Flatten each piece, wrap it around a red bean ball and pinch closed. Place seam-side down.", "Mochi is best eaten the same day.", null),
  ],
  // Buuz (Mongolian)
  55: [
    s("Make the dough", "Mix the flour, 1 tsp salt and about 1¼ cups water. Knead until smooth, then rest covered.", "A firm dough holds the juices in.", 20),
    s("Make the filling", "Mix the meat with the onion, garlic, pepper, ½ tsp salt and ⅓ cup cold water until juicy.", "Fattier meat makes juicier buuz.", null),
    s("Roll the wrappers", "Roll the dough into a log, cut 30 pieces and roll each into an 8 cm circle that's thicker in the middle.", "Thin edges and a thick center stop the bottoms tearing.", null),
    s("Fold", "Spoon filling into the center and pleat the edges around it, leaving a small opening on top.", "The little hole on top is the traditional buuz look.", null),
    s("Steam", "Oil the steamer and arrange the buuz with space between them. Steam over boiling water.", "Don't open the lid while they steam.", 20),
    s("Serve", "Serve hot with a fresh salad or ketchup.", "Bite carefully — there's hot broth inside!", null),
  ],
  // Khuushuur (Mongolian)
  56: [
    s("Make the dough", "Mix the flour, a pinch of salt and about 1 cup water into a smooth dough. Rest covered.", "Rested dough rolls out thin without tearing.", 15),
    s("Make the filling", "Mix the meat with the grated onion, garlic, salt, pepper and ¼ cup water.", "Water keeps the filling juicy as it fries.", null),
    s("Shape", "Roll 12 cm circles, put filling on one half, fold into a half-moon, press out the air and crimp the edge.", "Trapped air makes them burst in the oil.", null),
    s("Heat the oil", "Heat 1 cm of oil in the frying pan to about 175°C / 350°F.", "A scrap of dough should sizzle steadily.", null),
    s("Fry", "Fry until deep golden and puffed, turning once.", "About 3–4 minutes per side.", 8),
    s("Serve", "Drain, press lightly flat and serve hot.", "A Naadam festival classic — eat with your hands.", null),
  ],
  // Tsuivan (Mongolian)
  57: [
    s("Make the dough", "Knead the flour, a pinch of salt and about ¾ cup water into a stiff dough. Rest covered.", "Stiff dough makes chewy noodles.", 15),
    s("Cut the noodles", "Roll the dough out to 2 mm, brush with oil, roll it up and slice into thin noodles. Toss with a little flour.", "Oil stops the layers from sticking together.", null),
    s("Fry the meat", "Fry the beef strips in oil over high heat.", "Mutton is traditional; beef works too.", 3),
    s("Add the vegetables", "Add the onion, carrot, cabbage and garlic and stir-fry.", "Keep them a little crunchy.", 3),
    s("Steam the noodles", "Spread the noodles over the vegetables, pour in ½ cup water, cover and steam over medium-low heat.", "The noodles cook in the steam on top.", 10),
    s("Toss and serve", "Uncover and toss everything until the liquid is absorbed. Season with salt and pepper.", "A dash of soy sauce is a modern twist.", 2),
  ],
  // Bansh soup (Mongolian)
  58: [
    s("Make the dough", "Mix the flour, a pinch of salt and about ¾ cup water. Knead until smooth and rest covered.", "Smooth dough makes thin, delicate wrappers.", 15),
    s("Make the filling", "Mix the beef with the minced onion, garlic, salt and a splash of water.", "Mix until sticky so it holds together.", null),
    s("Shape the bansh", "Roll small 6 cm circles, fill each one, fold into a half-moon and bring the two corners together.", "Small bansh cook quickly and evenly.", null),
    s("Start the soup", "Boil 1.5 L water with the potatoes and carrot and a pinch of salt.", "Use broth instead of water for a richer soup.", 10),
    s("Cook the bansh", "Add the bansh and simmer until they float, then 2 minutes more.", "Stir gently so they don't stick to the bottom.", 8),
    s("Serve", "Season to taste and serve hot.", "Some families serve bansh in milk tea instead.", null),
  ],
  // Boortsog (Mongolian)
  59: [
    s("Warm the milk", "Warm the milk with the sugar and butter until the butter melts.", "Warm, not hot.", null),
    s("Make the dough", "Mix the flour, baking powder and salt, add the milk mixture and knead into a soft dough. Rest covered.", "Rested dough fries up lighter.", 15),
    s("Shape", "Roll out to 1 cm thick and cut into small rectangles, cutting a slit in the middle of each.", "The slit helps them cook through.", null),
    s("Heat the oil", "Heat 3 cm of oil in the frying pan to about 170°C / 340°F.", "Too hot and the outside burns before the inside cooks.", null),
    s("Fry", "Fry in batches, turning, until golden.", "Don't crowd the pan.", 3),
    s("Serve", "Drain and serve with milk tea, jam or a sprinkle of sugar.", "They keep for days in an airtight jar.", null),
  ],
  // Japchae (Korean)
  60: [
    s("Cook the noodles", "Boil the glass noodles for 6 minutes until soft and chewy. Drain, rinse in cold water and cut them a few times with scissors.", "Toss with 1 tsp sesame oil so they don't stick together.", 6),
    s("Make the sauce", "Mix the soy sauce, sugar, half the garlic and 1 tbsp sesame oil in a bowl.", "Taste it — it should be sweet and salty.", null),
    s("Wilt the spinach", "Blanch the spinach in the noodle water for 30 seconds, squeeze dry and season with a pinch of salt.", "Squeeze hard — extra water makes the dish soggy.", 1),
    s("Stir-fry the vegetables", "Heat 1 tbsp oil in the frying pan and stir-fry the onion, carrot and mushrooms one after another until just tender. Set aside.", "Cooking them separately keeps each one bright and crisp.", 5),
    s("Cook the beef", "Add the remaining oil and garlic, then the beef with 1 tbsp of the sauce. Stir-fry until browned.", "Slice the beef thin against the grain so it stays tender.", 3),
    s("Toss together", "Add the noodles, vegetables and the rest of the sauce to the pan. Toss over low heat for 2 minutes until glossy.", "Use tongs or chopsticks to keep the noodles from breaking.", 2),
    s("Serve", "Finish with the remaining sesame oil and serve warm or at room temperature.", "Sprinkle toasted sesame seeds on top if you have them.", null),
  ],
  // Pad Kra Pao (Thai)
  61: [
    s("Start the rice", "Rinse the rice and cook it in the pot with 2 cups of water, covered, on low heat.", "Leave the lid on so it steams evenly.", 15),
    s("Pound the aromatics", "Crush the garlic and chilies together roughly with the flat of a knife or a mortar.", "Use fewer chilies if you don't like it hot.", null),
    s("Fry the eggs", "Heat 2 tbsp oil in the frying pan until very hot and fry the eggs until the edges are crisp and lacy. Set aside.", "Spoon hot oil over the yolk to set the top.", 3),
    s("Stir-fry the pork", "Add the remaining oil, then the garlic and chilies for 20 seconds. Add the pork and stir-fry over high heat until browned.", "Keep the heat high so the pork fries rather than stews.", 5),
    s("Season", "Add the oyster sauce, soy sauce, fish sauce and sugar with a splash of water. Toss until glossy.", "The sauce should just coat the meat, not pool.", 1),
    s("Add the basil", "Turn off the heat and fold in the basil until it just wilts.", "Basil goes in last — it turns black if cooked too long.", null),
    s("Serve", "Spoon over rice and top each plate with a fried egg.", "Break the yolk into the pork as you eat.", null),
  ],
  // Horiatiki (Greek)
  62: [
    s("Cut the vegetables", "Cut the tomatoes into wedges, slice the cucumber into thick half-moons, and thinly slice the onion and pepper.", "Chunky pieces are traditional — this isn't a chopped salad.", null),
    s("Season the vegetables", "Put the vegetables in a wide bowl with the olives. Sprinkle with salt and toss gently.", "Salting draws out the tomato juice that becomes the dressing.", null),
    s("Dress", "Drizzle with the vinegar and most of the olive oil and toss once more.", "Use your best olive oil here — you'll taste it.", null),
    s("Add the feta", "Lay the feta on top as a whole slab. Drizzle with the remaining oil and sprinkle with oregano.", "Let everyone break off their own feta at the table.", null),
    s("Serve", "Serve with bread to mop up the juices at the bottom of the bowl.", "It's best eaten within the hour, before the cucumber softens.", null),
  ],
  // Menemen (Turkish)
  63: [
    s("Soften the peppers", "Melt the butter with the olive oil in the frying pan over medium heat. Add the pepper (and onion, if using) and cook until soft.", "Don't let them brown — you want them sweet.", 5),
    s("Cook the tomatoes", "Add the tomatoes, chili flakes and a pinch of salt. Cook until they break down into a thick sauce.", "Most of the liquid should cook off, or the eggs will be watery.", 6),
    s("Add the eggs", "Crack in the eggs. Wait a few seconds, then stir gently a few times so they set in soft ribbons.", "Pull it off the heat while it still looks a little runny.", 2),
    s("Serve", "Serve straight from the pan with plenty of bread.", "In Turkey it's eaten communally, scooped up with bread.", null),
  ],
  // Mercimek Çorbası (Turkish)
  64: [
    s("Soften the vegetables", "Melt 1 tbsp butter in the pot and cook the onion and carrot until soft.", "A gentle heat keeps the soup sweet, not bitter.", 5),
    s("Toast the spices", "Stir in the tomato paste and cumin and cook for a minute.", "Frying the paste deepens its flavor.", 1),
    s("Simmer", "Add the rinsed lentils, potato and stock. Bring to a boil, then simmer partly covered until the lentils fall apart.", "Stir now and then — lentils like to stick to the bottom.", 25),
    s("Blend", "Blend the soup until completely smooth. Add a little water if it's too thick and season with salt.", "Let it cool for a few minutes first and don't overfill the blender.", null),
    s("Make paprika butter", "Melt the remaining butter in a small pan and stir in the paprika until it sizzles.", "Take it off the heat as soon as it foams so the paprika doesn't burn.", 1),
    s("Serve", "Ladle into bowls, drizzle with the paprika butter and serve with lemon wedges.", "A good squeeze of lemon is essential — it brightens the whole bowl.", null),
  ],
};
