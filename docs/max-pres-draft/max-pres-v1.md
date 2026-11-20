## 1. Recap of prev. / Intro to creative decisions
- spoken: Now before we get very technical, I would like to speak a bit broadly about how we make creative decisions. Nora showed how the more specific instructions you give an llm are, the more specific your results will be. 
  text: Specific Instructions = specific results.
  *visual: generic vs detailed prompt*
- spoken: Specific instructions are creative decisions.
  text: Specific instructions = creative decisions.
  *visual: zoom focus on detailed prompt, highlight individual instructions with connector line to bold "creative decisions"*
- spoken: Design school teaches you how to communicate and apply creative decisions.
  text: Design school teaches syntax and application of creative decisions.
  *visual: illustration utilizing visualised 3 point perspective, (dithered) shading, and composition with connector line to defined terms*
- spoken: Because of this, we are better equipped than most to make what we want with or without AI, and thats what I'd like to talk about. But first: A thought experiment.
  

## 2. Taste hypothetical.
- spoken:  What design school does *not* teach you is what the "correct" creative decisions are. So I ask, who has heard of the Oscar Meyer Weinermobile, raise your hand? Does it make you happy? Does it get you from point A to point B?
  text: This is a weinermobile. Does this bring you joy? Is this a functional means of transport?
  *visual: rotating 3d rendering of weinermobile.*
- spoken: Great, so it is functional and the public enjoys it. We now live in a world where all vehicles are the Weinermobile.
  text: All vehicles are the Weinermobile. All vehicles have always been the Weinermobile.
  *visual: 6-lane rotating highway with multiple weinermobiles*
- spoken: Raise your hand if would like to drive something other than the weinermobile, if you could ever conceive such an object? (Wait for affirmative response. Choose a hand.) Why? (wait for reasoning.) What would you make instead? (if participant says car, ask them to describe car)
  text: Should all vehicles be the weinermobile? If not, why? What should exist instead? Is there a use case for the weinermobile?
- spoken to participant: Congratulations, you have made a bold creative decision based on your own taste.

## 3. Applying individual taste.
- spoken: If there is one thing tech bros will not shut up about, it is taste. And they won't shut up about it to the point that they've started to call it other things, like "point of view" or "opinionated decision making". Because nothing shows bad taste like using the same words as the last guy.
  text: What is "taste"?
  *visual: "taste", "opinionated", "point of view" morphing into each other*
- spoken: Taste is just the current buzzword for knowing: What you want to make and why you want to make it.
  *visual: center and zoom out on taste graphic -  Taste = What you want to exist. + Why it should exist. (on 5 well spaced lines)*
- spoken: Or alternatively, taste is your ability to define your creative decisions and your judgement and justification of them.
  *visual: (Articulation of Creative Decisions) and (Justification + Judgment) below the what / why sentences*
- spoken: Before, digital media was very much constricted by technological limitations. Admittedly, there have been ebbs and flows of periods where personal taste was applied more or less dramatically.
  *visual: comparison of plain html site, geocities site, twitter.*
- spoken: But generally speaking doing anything digital required specialized knowledge in a whole other field. Even today, about half of our education in digital media design is learning how to use a bunch of unintuitive digital programs, which someone has to pay for, that really aren't connected to each other at all, even if we know they function in similar ways. Currently, one of the most lucrative jobs we can aspire to is just figuring out the best way to connect the outputs of these programs in a coherent way. But most people can't afford to hire that person.
  text: Current system = infinite-symbol programs that all do similar but slightly different things for different uses.
  *visual: multiple filetypes scrambled together*
- spoken: So, as the web and digital media became normalised, the mass majority of non-technical people opted for the easiest solution that worked and looked "good enough", leading to the proliferation of templates. Admittedly, these have their utility in that you are guaranteed a usable and navigable web presence, but they are often the digital equivalent of a beige apartment you can't really customize. The tragedy is visual thinkers like us were forced into these templates even when we could easily conceive of a more personalised interface unless we wanted to spend at least a year independently learning web development, or paying someone else a considerable amount to build our vision.
  text: Templates made using the web easy, but boring.
  *visual: comparison image of standard e-commerce page and artist's page using similar template.*
- spoken: so our situation *was* visually interesting and technically challenging or visually boring and technically easy.
  text: Old way = tech: hard but visuals: interesting or tech: easy but visuals: boring.
  *visual: filetype knot and artist template shown together, lightly bouncing*
- spoken: Now suppose one day it stopped being technically challenging. 
  text: But what if it *stopped* being technically challenging to make what you want digitally. 
  *visual: 1. filetypes merge to center (a la whirlpool) and new symbols: 3D, Texture, Layout, Motion exit to left neatly connected to a central project symbol node which connects to the artists template which pivots to orthogonal, layered 3d object, layout panels morph to geometric and abstract shapes and patterns.*
- spoken: But, the benefit of the previous model is you knew exactly what each program was meant to be used for. If you get rid of them, what do you do now? More importantly, how do you keep control of your creative decisions and not just make slop?
  text: But the tools we learned had a genuine *purpose*, they acted as bridge between traditional design techniques and digital capabilities. How can I design by just chatting to a robot? (Spoiler: Chat becomes just 10% of the process)
  *visual needed*

## 4.  Coding agents.
- spoken: Nora has taught you how to generate a website by giving specific instructions to an LLM model in a single chat. In this case that chat is the extent of the model's context and lovable is the only place you can do anything. But LLM's like claude have been modified to interact with files on your computer for your own software or web development projects. Particularly this modified LLM, called a coding agent, can be opened in a folder where you can do and save what you want. This folder can have many files with specific purposes within a folder, and it turns out an LLM's context can too. These files can be rules for the LLM to follow, image references, documents about the project itself, or tools that help you make things for the project. You can think of it as a mini-internet all about your project for the LLM to read. If you thought Prof. Poljicak's emphasis on file folder organisation was a formality before, I promise it becomes very crucial from this point on. But specifically how you organise it is up to you. 
  text: A single chat is limited context. Using an LLM in a project folder allows context to exist in multiple documents. 
  *visual: large prompt with individual decisions highlighted transformed to project folder with connector lines to detailed documents.*
- spoken: It is also common for the project to have an overview document that tells the llm what the purpose of the project is and how to navigate it. If you're using claude code this will be called a CLAUDE.md, other coding agents call it something different. md stands for markdown and its best to just think of it as somewhere between plain text and html, so its easy to read but also easy to organize. I highly recommend getting a free application called obsidian which makes markdown super easy to read and write. Honestly, it's best to just tell the LLM what you are trying to do and imagine how you want it organised and have it write it's own overview.
  text: Overview (CLAUDE.md or AGENTS.md): Tells the coding agent what we're doing and where to look. Contains a table of contents and overview of the project. Uses Markdown: legible but organised.
  *visual: Project folder focuses on CLAUDE.md, connector line shows this projects overview page.*

## 5. Skills
- spoken: one thing you learn about very quickly in llm-assisted development is skills. These are basically prompts which tell the LLM to do something, which are instantiated by a particular keyword, which you can either tie to a specific project or keep for any project you use. You can think of these like commands in a program, but much more broad. Skills can either tell the LLM the steps it should follow in a task, for instance how to build components to a certain design system. Or, it can dissuade certain actions when performing a task, this is where you'll see a lot of "don't make slop" and "write like a human" skills. Or, my personal favorite skill use case, it can direct how the LLM interacts with you. The one skill I consistently use is called "/grill-me", created by programmer Matt Hancock, which simply tells the LLM to ask you specifically about what you are trying to do so it gets a thorough understanding. This relates to a key issue with skills which is, many skills, that other people make basically amount to their method of creative decision making. Now, the level and specific area to which that matters to you is up to you. Perhaps a skill someone wrote that tells the LLM to use a certain coding methodology doesn't bother to you, but a skill that tells an LLM how to build a color scheme does.
  text: Skills: keywords for directions an LLM to follow. Can be as broad or specific as you want. If written by others, can make decisions for you.

## 6. Design Systems
- spoken: So you know you should have a project in a folder and you can use skills, but you what else goes into that folder? How else can you control the output of this thing? Luckily, we've more or less solved this way before the invention of LLMs. 
  
  Say you make a poster. As designers, you spend quite a bit of time on the exact layout, typography, color scheme, graphics, maybe even texture. If you do that for one poster, great, you make settle on each choice and call it a day. But what if you have to make 100 posters, what if instead of making a poster you are making a website with multiple pages? What elements are you keeping the same for all of them? What elements have wiggle room, maybe you could even define what that "wiggle room" is. 
  
  Before everyone had computers, this would be called a brand system. Literal rules for what typeface to use, how big to make certain elements, illustration style, colors to use. Again before computers, these were written for people and it was hoped the people will follow the rules or at least interpret them to the best of their ability. Nowadays, we call those rules a design system, and we can encode it such that these rules are always followed. 
  
  This is really just an extension of the idea that the more specific instructions you give an llm, the more specific your result. Like everything I've been talking about, you can get as general or specific in both instructions and organisation as you want. This is where you want to consider how broad a "creative decision" can be, it applies even to the organisation of such decisions. On a technical level, you will most likely define areas of a design system, say "Typography" or "Color Scheme" and define them to the best of your ability in individual documents.